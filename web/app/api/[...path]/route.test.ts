/**
 * @vitest-environment node
 *
 * O route handler roda no servidor do Next (runtime nodejs): `Request`, `Response`, `Headers` e
 * `getSetCookie()` são os do Node. O `fetch` até a API é substituído por um dublê que grava a
 * requisição repassada e devolve a resposta montada pelo teste.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as route from "./route";

const WEB = "http://localhost:3001";
const API = "http://api.interna:3000";

/** CSV com BOM, `;`, CRLF e não ASCII: tem de chegar byte a byte nos dois sentidos. */
const CSV = new Uint8Array([
  0xef,
  0xbb,
  0xbf,
  ...new TextEncoder().encode('competencia;descricao\r\n2026-10;"Pão ""francês"""\r\n'),
]);

let upstream: Response;
const fetchMock = vi.fn<(input: string, init: RequestInit) => Promise<Response>>(
  async () => upstream,
);

/** Requisição e opções que o handler passou ao `fetch`. */
function forwarded(): { target: string; init: RequestInit; headers: Headers } {
  const [target, init] = fetchMock.mock.calls[0];
  return { target, init, headers: init.headers as Headers };
}

beforeEach(() => {
  upstream = new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("API_ORIGIN", API);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("configuração da rota", () => {
  it("roda no runtime nodejs e é sempre dinâmica", () => {
    expect(route.runtime).toBe("nodejs");
    expect(route.dynamic).toBe("force-dynamic");
  });

  it("atende todos os métodos com o mesmo repasse", () => {
    const methods = [route.GET, route.HEAD, route.POST, route.PUT, route.PATCH, route.DELETE];
    expect(new Set([...methods, route.OPTIONS]).size).toBe(1);
  });
});

describe("API_ORIGIN", () => {
  it("responde 500 sem corpo e não chama a API quando a variável está ausente", async () => {
    vi.stubEnv("API_ORIGIN", "");

    const response = await route.GET(new Request(`${WEB}/api/health`));

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("é lida a cada requisição, não ao carregar o módulo", async () => {
    await route.GET(new Request(`${WEB}/api/health`));
    vi.stubEnv("API_ORIGIN", "https://outra.api.exemplo");
    await route.GET(new Request(`${WEB}/api/health`));

    expect(fetchMock.mock.calls.map(([target]) => target)).toEqual([
      `${API}/health`,
      "https://outra.api.exemplo/health",
    ]);
  });

  it("aceita a origem com barra no fim", async () => {
    vi.stubEnv("API_ORIGIN", `${API}/`);

    await route.GET(new Request(`${WEB}/api/users/me`));

    expect(forwarded().target).toBe(`${API}/users/me`);
  });
});

describe("requisição repassada", () => {
  it("tira o prefixo /api e mantém a query com a codificação original", async () => {
    await route.GET(
      new Request(`${WEB}/api/expenses/one-time/a%2Fb?descricao=p%C3%A3o%20doce&mes=10`),
    );

    expect(forwarded().target).toBe(
      `${API}/expenses/one-time/a%2Fb?descricao=p%C3%A3o%20doce&mes=10`,
    );
  });

  it("não segue redirect da API e não usa cache", async () => {
    await route.GET(new Request(`${WEB}/api/health`));

    expect(forwarded().init).toMatchObject({
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    });
    expect(forwarded().init.body).toBeUndefined();
  });

  it.each(["GET", "HEAD"])("não envia corpo em %s", async (method) => {
    await route.GET(new Request(`${WEB}/api/data/export`, { method }));

    expect(forwarded().init).toMatchObject({ method, body: undefined });
  });

  it("repassa método e corpo JSON", async () => {
    const body = JSON.stringify({ email: "ana@example.com", password: "senha-bem-longa" });

    await route.POST(
      new Request(`${WEB}/api/auth/login`, {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    );

    const { init, headers } = forwarded();
    expect(init.method).toBe("POST");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(body);
    expect(headers.get("content-type")).toBe("application/json");
  });

  it.each(["PUT", "PATCH", "DELETE"])("repassa o corpo em %s", async (method) => {
    await route.PATCH(
      new Request(`${WEB}/api/revenues/fixed/1`, { method, body: '{"amount":10}' }),
    );

    expect(forwarded().init.method).toBe(method);
    expect(new TextDecoder().decode(forwarded().init.body as ArrayBuffer)).toBe('{"amount":10}');
  });

  it("repassa o upload text/csv byte a byte", async () => {
    await route.POST(
      new Request(`${WEB}/api/data/import`, {
        method: "POST",
        body: CSV,
        headers: { "content-type": "text/csv; charset=utf-8" },
      }),
    );

    const { init, headers } = forwarded();
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(CSV);
    expect(headers.get("content-type")).toBe("text/csv; charset=utf-8");
  });

  it("mantém Authorization, Cookie, Origin e os X-Forwarded-* do Next", async () => {
    await route.POST(
      new Request(`${WEB}/api/auth/refresh`, {
        method: "POST",
        headers: {
          authorization: "Bearer abc",
          cookie: "smaug_refresh=r1; smaug_session=1",
          origin: WEB,
          "x-forwarded-for": "203.0.113.9",
          "x-forwarded-host": "localhost:3001",
          "x-forwarded-proto": "http",
        },
      }),
    );

    const { headers } = forwarded();
    expect(headers.get("authorization")).toBe("Bearer abc");
    expect(headers.get("cookie")).toBe("smaug_refresh=r1; smaug_session=1");
    expect(headers.get("origin")).toBe(WEB);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.9");
    expect(headers.get("x-forwarded-host")).toBe("localhost:3001");
    expect(headers.get("x-forwarded-proto")).toBe("http");
  });

  it("remove os cabeçalhos de salto e os que o fetch recalcula", async () => {
    const hopByHop = {
      connection: "keep-alive",
      "keep-alive": "timeout=5",
      "proxy-authorization": "Basic x",
      "proxy-connection": "keep-alive",
      te: "trailers",
      trailer: "Expires",
      upgrade: "websocket",
      host: "localhost:3001",
      "content-length": "2",
    };

    // Sem corpo: no ambiente do Vitest, um `Request` com corpo descarta cabeçalhos assim.
    const incoming = new Request(`${WEB}/api/users/me`, {
      headers: { ...hopByHop, accept: "application/json" },
    });
    for (const name of Object.keys(hopByHop)) expect(incoming.headers.has(name)).toBe(true);

    await route.GET(incoming);

    const { headers } = forwarded();
    for (const name of Object.keys(hopByHop)) expect(headers.has(name)).toBe(false);
    expect(headers.get("accept")).toBe("application/json");
  });
});

describe("resposta devolvida", () => {
  it("devolve status, statusText e corpo da API", async () => {
    upstream = new Response('{"error":"INVALID_CREDENTIALS"}', {
      status: 401,
      statusText: "Unauthorized",
      headers: { "content-type": "application/json" },
    });

    const response = await route.POST(
      new Request(`${WEB}/api/auth/login`, { method: "POST", body: "{}" }),
    );

    expect(response.status).toBe(401);
    expect(response.statusText).toBe("Unauthorized");
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "INVALID_CREDENTIALS" });
  });

  it("mantém cada Set-Cookie separado e com os atributos intactos", async () => {
    const refresh =
      "smaug_refresh=abc.DEF_123-xyz; Max-Age=2592000; Path=/api/auth; HttpOnly; Secure; SameSite=Strict";
    const other = "other=1; Path=/; HttpOnly; SameSite=Lax";
    upstream = new Response("{}", {
      status: 200,
      headers: [
        ["set-cookie", refresh],
        ["set-cookie", other],
        ["content-type", "application/json"],
      ],
    });

    const response = await route.POST(
      new Request(`${WEB}/api/auth/login`, { method: "POST", body: "{}" }),
    );

    expect(response.headers.getSetCookie()).toEqual([refresh, other]);
  });

  it("devolve o download CSV byte a byte com Content-Disposition", async () => {
    upstream = new Response(CSV, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="smaug-2026-01-a-2026-10.csv"',
      },
    });

    const response = await route.GET(new Request(`${WEB}/api/data/export?inicio=2026-01`));

    expect(new Uint8Array(await response.arrayBuffer())).toEqual(CSV);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="smaug-2026-01-a-2026-10.csv"',
    );
  });

  it("tira Content-Encoding, Content-Length e cabeçalhos de salto: o fetch já descomprimiu", async () => {
    upstream = new Response("ok", {
      status: 200,
      headers: {
        "content-encoding": "gzip",
        "content-length": "2",
        connection: "keep-alive",
        "keep-alive": "timeout=5",
        "x-request-id": "r-1",
      },
    });

    const response = await route.GET(new Request(`${WEB}/api/health`));

    expect(response.headers.has("content-encoding")).toBe(false);
    expect(response.headers.has("content-length")).toBe(false);
    expect(response.headers.has("connection")).toBe(false);
    expect(response.headers.has("keep-alive")).toBe(false);
    expect(response.headers.get("x-request-id")).toBe("r-1");
  });

  it("passa o redirect da API ao navegador", async () => {
    upstream = new Response(null, { status: 302, headers: { location: "/em-outro-lugar" } });

    const response = await route.GET(new Request(`${WEB}/api/qualquer`));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/em-outro-lugar");
  });

  it("responde 204 sem corpo", async () => {
    upstream = new Response(null, { status: 204 });

    const response = await route.POST(new Request(`${WEB}/api/auth/logout`, { method: "POST" }));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("responde 502 sem corpo quando a API está inalcançável", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await route.GET(new Request(`${WEB}/api/health`));

    expect(response.status).toBe(502);
    expect(await response.text()).toBe("");
  });
});
