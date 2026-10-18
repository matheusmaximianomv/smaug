import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { db, mockApiError, mockNetworkError, server, url } from "../tests/msw";
import { loginAs } from "../tests/session";
import { recordRequests, signatures } from "../tests/requests";

/** `window.location` é não-configurável no jsdom 29: o redirect é observado pela costura. */
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

const { refreshSession, REFRESH_URL } = await import("./auth-refresh");
const { redirectToLogin } = await import("./navigation");
const { getAccessToken, hasSessionHint } = await import("./session");

/** Responde `/auth/refresh` com a sequência de status dada e, depois dela, com o handler padrão. */
function refreshAnswers(...statuses: number[]): void {
  for (const status of [...statuses].reverse()) {
    server.use(
      http.post(
        url("/auth/refresh"),
        () =>
          HttpResponse.json(
            { error: status === 409 ? "REFRESH_TOKEN_CONFLICT" : "INVALID_REFRESH_TOKEN" },
            { status },
          ),
        { once: true },
      ),
    );
  }
}

describe("refreshSession", () => {
  it("chama a renovação do repasse /api, sem Bearer", async () => {
    loginAs();
    const calls = recordRequests();

    await refreshSession();

    expect(REFRESH_URL).toBe("/api/auth/refresh");
    expect(signatures(calls)).toEqual(["POST /auth/refresh"]);
    expect(calls[0].headers.get("authorization")).toBeNull();
  });

  it("guarda o token novo e devolve a sessão com o perfil", async () => {
    const user = loginAs();
    const before = getAccessToken();

    const session = await refreshSession();

    expect(session.user).toEqual(user);
    expect(session.accessToken).not.toBe(before);
    expect(getAccessToken()).toBe(session.accessToken);
    expect(hasSessionHint()).toBe(true);
  });

  it("faz uma única renovação para chamadas simultâneas", async () => {
    loginAs();
    const calls = recordRequests();

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(signatures(calls)).toEqual(["POST /auth/refresh"]);
    expect(new Set(results.map((s) => s.accessToken)).size).toBe(1);
  });

  it("renova de novo depois que a anterior terminou", async () => {
    loginAs();
    const calls = recordRequests();

    await refreshSession();
    await refreshSession();

    expect(signatures(calls)).toEqual(["POST /auth/refresh", "POST /auth/refresh"]);
  });

  it("libera uma nova renovação depois de uma que falhou", async () => {
    loginAs();
    mockApiError("post", "/auth/refresh", 503, {});
    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 503 } });

    server.resetHandlers();
    await expect(refreshSession()).resolves.toMatchObject({ tokenType: "Bearer" });
  });

  it("tenta mais uma vez depois de 409 e segue sem erro", async () => {
    loginAs();
    refreshAnswers(409);
    const calls = recordRequests();

    const session = await refreshSession();

    expect(signatures(calls)).toEqual(["POST /auth/refresh", "POST /auth/refresh"]);
    expect(getAccessToken()).toBe(session.accessToken);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("não tenta uma terceira vez: dois 409 rejeitam sem encerrar a sessão", async () => {
    loginAs();
    const token = getAccessToken();
    refreshAnswers(409, 409);
    const calls = recordRequests();

    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 409 } });

    expect(calls).toHaveLength(2);
    expect(getAccessToken()).toBe(token);
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("em 401 apaga token e indicador ANTES de mandar para o login", async () => {
    loginAs();
    db.session = null;
    let hintAtRedirect: boolean | null = null;
    vi.mocked(redirectToLogin).mockImplementation(() => {
      hintAtRedirect = hasSessionHint();
    });

    await expect(refreshSession()).rejects.toMatchObject({
      response: { status: 401, data: { error: "INVALID_REFRESH_TOKEN" } },
    });

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
    expect(hintAtRedirect).toBe(false);
  });

  it("encerra a sessão quando a nova tentativa depois de 409 recebe 401", async () => {
    loginAs();
    refreshAnswers(409, 401);

    await expect(refreshSession()).rejects.toMatchObject({ response: { status: 401 } });

    expect(getAccessToken()).toBeNull();
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it.each([500, 503])("rejeita %i sem encerrar a sessão", async (status) => {
    loginAs();
    const token = getAccessToken();
    mockApiError("post", "/auth/refresh", status, {});

    await expect(refreshSession()).rejects.toMatchObject({ response: { status } });

    expect(getAccessToken()).toBe(token);
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("rejeita falha de rede sem encerrar a sessão", async () => {
    loginAs();
    mockNetworkError("post", "/auth/refresh");

    const error = await refreshSession().catch((e) => e);

    expect(error.response).toBeUndefined();
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });
});
