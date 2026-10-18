import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { db, mockApiError, mockNetworkError, server, url } from "../tests/msw";
import { loginAs } from "../tests/session";
import { recordRequests, signatures } from "../tests/requests";
import { makeUser } from "../tests/fixtures";

/**
 * `window.location` é não-configurável no jsdom 29: o único jeito de observar o
 * redirect de sessão expirada é pela costura `@/infra/navigation`.
 */
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const { apiClient } = await import("./api-client");
const { redirectToLogin } = await import("./navigation");
const { getAccessToken, hasSessionHint, setSession } = await import("./session");
const { refreshSession } = await import("./auth-refresh");
const { openSession } = await import("../tests/msw/handlers/auth");

const PING = "/expenses/categories";

let seenHeaders: Headers | null = null;

beforeEach(() => {
  seenHeaders = null;
  server.use(
    http.get(url(PING), ({ request }) => {
      seenHeaders = request.headers;
      return HttpResponse.json([]);
    }),
  );
});

/** Faz `path` responder 401 `UNAUTHORIZED` só na próxima chamada (o token "expirou"). */
function expireOnce(path: string, method: "get" | "post" = "get"): void {
  server.use(
    http[method](url(path), () => HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }), {
      once: true,
    }),
  );
}

describe("interceptor de request", () => {
  it("usa o repasse /api da própria origem como baseURL", () => {
    expect(apiClient.defaults.baseURL).toBe("/api");
    expect(apiClient.defaults.withCredentials).toBeFalsy();
  });

  it("injeta o access token em memória como Bearer", async () => {
    loginAs();

    await apiClient.get(PING);

    expect(seenHeaders!.get("authorization")).toBe(`Bearer ${getAccessToken()}`);
  });

  it("omite Authorization quando não há sessão", async () => {
    await apiClient.get(PING);

    expect(seenHeaders!.get("authorization")).toBeNull();
  });

  it("não envia mais X-User-Id", async () => {
    loginAs();

    await apiClient.get(PING);

    expect(seenHeaders!.get("x-user-id")).toBeNull();
  });

  it("envia Content-Type application/json nas requisições com corpo", async () => {
    let contentType: string | null = null;
    server.use(
      http.post(url("/expenses/categories"), ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({}, { status: 201 });
      }),
    );

    await apiClient.post("/expenses/categories", { name: "Moradia" });

    expect(contentType).toBe("application/json");
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});

describe("interceptor de response: renovação em 401", () => {
  it("renova e refaz a chamada uma vez com o token novo", async () => {
    loginAs();
    const before = getAccessToken();
    expireOnce(PING);
    const calls = recordRequests();

    const response = await apiClient.get(PING);

    expect(response.data).toEqual([]);
    expect(signatures(calls)).toEqual([`GET ${PING}`, "POST /auth/refresh", `GET ${PING}`]);
    expect(calls[2].headers.get("authorization")).toBe(`Bearer ${getAccessToken()}`);
    expect(getAccessToken()).not.toBe(before);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("refaz a chamada com o mesmo método e corpo", async () => {
    loginAs();
    expireOnce("/expenses/categories", "post");
    server.use(
      http.post(url("/expenses/categories"), async ({ request }) =>
        HttpResponse.json(await request.json(), { status: 201 }),
      ),
    );

    const response = await apiClient.post("/expenses/categories", { name: "Moradia" });

    expect(response.status).toBe(201);
    expect(response.data).toEqual({ name: "Moradia" });
  });

  it("faz uma única renovação para três chamadas que falham juntas e refaz cada uma", async () => {
    loginAs();
    const paths = ["/expenses/categories", "/revenues/one-time", "/expenses/one-time"];
    let expired = true;
    for (const path of paths) {
      server.use(
        http.get(url(path), () =>
          expired
            ? HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 })
            : HttpResponse.json([]),
        ),
      );
    }
    server.use(
      http.post(url("/auth/refresh"), () => {
        expired = false;
        return HttpResponse.json({
          accessToken: "novo",
          tokenType: "Bearer",
          expiresIn: 600,
          user: db.users[0],
        });
      }),
    );
    const calls = recordRequests();

    const results = await Promise.all(paths.map((path) => apiClient.get(path)));

    expect(results.map((r) => r.data)).toEqual([[], [], []]);
    expect(signatures(calls).filter((s) => s === "POST /auth/refresh")).toHaveLength(1);
    expect(calls).toHaveLength(7);
  });

  it("tenta renovar mais uma vez depois de 409 e segue sem erro", async () => {
    loginAs();
    expireOnce(PING);
    server.use(
      http.post(
        url("/auth/refresh"),
        () => HttpResponse.json({ error: "REFRESH_TOKEN_CONFLICT" }, { status: 409 }),
        { once: true },
      ),
    );
    const calls = recordRequests();

    const response = await apiClient.get(PING);

    expect(response.status).toBe(200);
    expect(signatures(calls)).toEqual([
      `GET ${PING}`,
      "POST /auth/refresh",
      "POST /auth/refresh",
      `GET ${PING}`,
    ]);
  });

  it("não renova em laço: se a chamada refeita volta 401, só rejeita", async () => {
    loginAs();
    mockApiError("get", PING, 401, { error: "UNAUTHORIZED" });
    const calls = recordRequests();

    await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status: 401 } });

    expect(signatures(calls)).toEqual([`GET ${PING}`, "POST /auth/refresh", `GET ${PING}`]);
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("renovação recusada com 401 encerra a sessão e manda para o login", async () => {
    loginAs();
    db.session = null;
    mockApiError("get", PING, 401, { error: "UNAUTHORIZED" });

    await expect(apiClient.get(PING)).rejects.toMatchObject({
      response: { status: 401, data: { error: "INVALID_REFRESH_TOKEN" } },
    });

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it.each([500, 503])("renovação com %i rejeita sem encerrar a sessão", async (status) => {
    loginAs();
    const token = getAccessToken();
    expireOnce(PING);
    mockApiError("post", "/auth/refresh", status, {});

    await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status } });

    expect(getAccessToken()).toBe(token);
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("renovação sem rede rejeita sem encerrar a sessão", async () => {
    loginAs();
    expireOnce(PING);
    mockNetworkError("post", "/auth/refresh");

    const error = await apiClient.get(PING).catch((e) => e);

    expect(error.response).toBeUndefined();
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it.each(["/auth/login", "/auth/register", "/auth/logout", "/auth/logout-all", "/auth/refresh"])(
    "401 de %s não dispara renovação",
    async (path) => {
      mockApiError("post", path, 401, { error: "INVALID_CREDENTIALS" });
      const calls = recordRequests();

      await expect(apiClient.post(path, {})).rejects.toMatchObject({
        response: { status: 401, data: { error: "INVALID_CREDENTIALS" } },
      });

      expect(signatures(calls)).toEqual([`POST ${path}`]);
      expect(redirectToLogin).not.toHaveBeenCalled();
    },
  );
});

/** Faz `path` aceitar só o Bearer atual da aba e responder 401 a qualquer outro (ou a nenhum). */
function acceptOnlyCurrentToken(path: string): void {
  server.use(
    http.get(url(path), ({ request }) =>
      request.headers.get("authorization") === `Bearer ${getAccessToken()}`
        ? HttpResponse.json([])
        : HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }),
    ),
  );
}

describe("interceptor de request: renovação em andamento", () => {
  it("espera a renovação em voo e sai com o token novo, sem 401", async () => {
    loginAs();
    const calls = recordRequests();

    const refreshing = refreshSession();
    await apiClient.get(PING);
    const session = await refreshing;

    expect(signatures(calls)).toEqual(["POST /auth/refresh", `GET ${PING}`]);
    expect(calls[1].headers.get("authorization")).toBe(`Bearer ${session.accessToken}`);
  });

  it("sai com o token que houver quando a renovação em voo falha", async () => {
    loginAs();
    const token = getAccessToken();
    mockApiError("post", "/auth/refresh", 503, {});

    const refreshing = refreshSession().catch((e) => e);
    await apiClient.get(PING);

    expect((await refreshing).response.status).toBe(503);
    expect(seenHeaders!.get("authorization")).toBe(`Bearer ${token}`);
  });
});

describe("interceptor de response: 401 de requisição com token desatualizado", () => {
  it("refaz com o token atual sem renovar quando saiu com um token já trocado", async () => {
    loginAs();
    server.use(
      http.get(
        url(PING),
        () => {
          // Outra chamada renovou enquanto esta estava em voo.
          setSession("access-novo");
          return HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        },
        { once: true },
      ),
    );
    const calls = recordRequests();

    await apiClient.get(PING);

    expect(signatures(calls)).toEqual([`GET ${PING}`, `GET ${PING}`]);
    expect(calls[1].headers.get("authorization")).toBe("Bearer access-novo");
  });

  it("refaz com o token atual sem renovar quando saiu sem token", async () => {
    server.use(
      http.get(
        url(PING),
        () => {
          // A retomada da sessão terminou enquanto esta consulta estava em voo.
          setSession("access-novo");
          return HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        },
        { once: true },
      ),
    );
    const calls = recordRequests();

    await apiClient.get(PING);

    expect(signatures(calls)).toEqual([`GET ${PING}`, `GET ${PING}`]);
    expect(calls[1].headers.get("authorization")).toBe("Bearer access-novo");
  });

  it("renova quando a requisição saiu sem token e a aba ainda não tem nenhum (recarga)", async () => {
    const user = makeUser();
    db.users.push(user);
    openSession(user);
    acceptOnlyCurrentToken(PING);
    const calls = recordRequests();

    await apiClient.get(PING);

    expect(signatures(calls)).toEqual([`GET ${PING}`, "POST /auth/refresh", `GET ${PING}`]);
    expect(calls[2].headers.get("authorization")).toBe(`Bearer ${getAccessToken()}`);
  });

  it("várias levas de 401 que chegam depois de uma renovação fazem uma renovação só", async () => {
    loginAs();
    const paths = ["/expenses/categories", "/revenues/one-time", "/expenses/one-time"];
    const gates = paths.map(() => Promise.withResolvers<void>());
    paths.forEach((path, i) => {
      acceptOnlyCurrentToken(path);
      server.use(
        http.get(
          url(path),
          async () => {
            await gates[i].promise;
            return HttpResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
          },
          { once: true },
        ),
      );
    });
    const calls = recordRequests();

    // As três saem com o mesmo token e os 401 chegam um de cada vez, cada um depois da renovação
    // disparada pelo anterior já ter terminado.
    const requests = paths.map((path) => apiClient.get(path));
    for (const [i, gate] of gates.entries()) {
      gate.resolve();
      await requests[i];
    }

    expect((await Promise.all(requests)).map((r) => r.data)).toEqual([[], [], []]);
    expect(signatures(calls).filter((s) => s === "POST /auth/refresh")).toHaveLength(1);
  });
});

describe("interceptor de response: demais respostas", () => {
  it("repassa a resposta de sucesso sem alterar", async () => {
    const response = await apiClient.get(PING);

    expect(response.status).toBe(200);
    expect(response.data).toEqual([]);
  });

  it.each([403, 404, 409, 429, 500])(
    "rejeita %i sem renovar nem encerrar a sessão",
    async (status) => {
      loginAs();
      mockApiError("get", PING, status, {});
      const calls = recordRequests();

      await expect(apiClient.get(PING)).rejects.toMatchObject({ response: { status } });

      expect(signatures(calls)).toEqual([`GET ${PING}`]);
      expect(hasSessionHint()).toBe(true);
      expect(redirectToLogin).not.toHaveBeenCalled();
    },
  );

  it("rejeita falha de rede sem encerrar a sessão", async () => {
    loginAs();
    mockNetworkError("get", PING);

    const error = await apiClient.get(PING).catch((e) => e);

    expect(error.response).toBeUndefined();
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  // Erro sem `config` (falha antes de montar a requisição) não chega pelo MSW: o handler é chamado
  // direto, pela lista interna de interceptors do axios.
  it("rejeita um 401 sem config de requisição sem tentar renovar", async () => {
    const rejected = apiClient.interceptors.response as unknown as {
      handlers: { rejected: (error: unknown) => Promise<unknown> }[];
    };
    const error = { response: { status: 401 }, config: undefined };

    await expect(rejected.handlers[0].rejected(error)).rejects.toBe(error);
  });
});
