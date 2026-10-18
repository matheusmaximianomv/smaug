import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { clearSession, getAccessToken, hasSessionHint, setSession } from "@/infra/session";
import { redirectToLogin } from "@/infra/navigation";
import { db, mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { loginAs } from "../../../tests/session";
import { recordRequests, signatures } from "../../../tests/requests";
import { routerAdapterMock } from "../../../tests/router";
import { useAuth, safeDestination } from "./useAuth";

// Duplo da navegação dura: o caminho de 401 e o logout chamam `redirectToLogin`.
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

/**
 * `@/infra/session` e `@/infra/auth-refresh` ficam REAIS: o token, o indicador e a renovação são o
 * assunto de metade dos ramos. Só o roteamento é duplo.
 */
vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const USER = makeUser({ name: "Maria Souza" });
const PASSWORD = "senha muito segura";
const CREDENTIALS = { email: USER.email, password: PASSWORD };

/** Recarga da página: a aba perde o access token em memória e fica só com o indicador. */
function reloadTab() {
  clearSession();
  document.cookie = "smaug_session=1;path=/";
}

async function renderReady() {
  const rendered = renderHook(() => useAuth());
  await waitFor(() => expect(rendered.result.current.isLoading).toBe(false));
  return rendered;
}

describe("safeDestination", () => {
  it.each([
    ["/receitas", "/receitas"],
    ["/despesas?mes=2026-04", "/despesas?mes=2026-04"],
    [null, "/dashboard"],
    ["", "/dashboard"],
    ["https://malicioso.exemplo", "/dashboard"],
    ["//malicioso.exemplo", "/dashboard"],
    ["/\\malicioso.exemplo", "/dashboard"],
    ["receitas", "/dashboard"],
    ["/\t/malicioso.exemplo", "/dashboard"],
    [decodeURIComponent("/%09/malicioso.exemplo"), "/dashboard"],
    ["/\n/malicioso.exemplo", "/dashboard"],
    ["/\r/malicioso.exemplo", "/dashboard"],
    ["/ /malicioso.exemplo", "/dashboard"],
    ["/\\\\malicioso.exemplo", "/dashboard"],
    ["\\/malicioso.exemplo", "/dashboard"],
    ["/receitas\\..\\x", "/dashboard"],
    ["/ok?a=1#h", "/ok?a=1#h"],
  ])("%s → %s", (next, expected) => {
    expect(safeDestination(next)).toBe(expected);
  });
});

describe("useAuth: mount sem sessão", () => {
  it("termina o carregamento sem autenticar e sem chamar a API", async () => {
    const calls = recordRequests();

    const { result } = await renderReady();

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("useAuth: mount com access token em memória", () => {
  it("pede o perfil a /users/me, sem renovar", async () => {
    loginAs(USER);
    const calls = recordRequests();

    const { result } = await renderReady();

    expect(signatures(calls)).toEqual(["GET /users/me"]);
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe("useAuth: mount só com o indicador (recarga)", () => {
  it("renova em silêncio e usa o perfil devolvido pela renovação", async () => {
    loginAs(USER);
    reloadTab();
    const calls = recordRequests();

    const { result } = await renderReady();

    expect(signatures(calls)).toEqual(["POST /auth/refresh"]);
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);
    expect(getAccessToken()).toMatch(/^access-/);
  });

  it("roda a retomada uma única vez, mesmo com re-renders", async () => {
    loginAs(USER);
    reloadTab();
    const calls = recordRequests();

    const { rerender } = await renderReady();
    rerender();
    rerender();

    expect(signatures(calls)).toEqual(["POST /auth/refresh"]);
  });

  it("com o refresh recusado (401) não autentica, apaga o indicador e manda para o login", async () => {
    // Indicador sem refresh válido no servidor (`db.session` nulo).
    reloadTab();

    const { result } = await renderReady();

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });
});

describe("useAuth: falha transitória na retomada", () => {
  it("mantém a sessão no 503 e expõe a mensagem de perfil indisponível", async () => {
    loginAs(USER);
    reloadTab();
    mockApiError("post", "/auth/refresh", 503, {});

    const { result } = await renderReady();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe(
      "Não foi possível carregar seu perfil. Tente novamente em instantes.",
    );
    expect(hasSessionHint()).toBe(true);
    expect(redirectToLogin).not.toHaveBeenCalled();
  });

  it("mantém a sessão numa falha de rede ao pedir o perfil", async () => {
    loginAs(USER);
    mockNetworkError("get", "/users/me");

    const { result } = await renderReady();

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe(
      "Não foi possível carregar seu perfil. Tente novamente em instantes.",
    );
    expect(getAccessToken()).not.toBeNull();
  });
});

describe("useAuth: login", () => {
  it("guarda o token, autentica e leva ao dashboard", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    const { result } = await renderReady();

    await act(async () => {
      await result.current.login(CREDENTIALS);
    });

    expect(getAccessToken()).toMatch(/^access-/);
    expect(hasSessionHint()).toBe(true);
    expect(result.current.user).toEqual(USER);
    expect(result.current.isAuthenticated).toBe(true);
    expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("volta à rota pretendida em next quando ela é interna", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    const { result } = await renderReady();

    await act(async () => {
      await result.current.login(CREDENTIALS, "/receitas");
    });

    expect(routerAdapterMock.push).toHaveBeenCalledWith("/receitas");
  });

  it("ignora um next externo e vai para o dashboard", async () => {
    seedDb({ users: [USER], passwords: { [USER.id]: PASSWORD } });
    const { result } = await renderReady();

    await act(async () => {
      await result.current.login(CREDENTIALS, "//malicioso.exemplo");
    });

    expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("rejeita para cima e não guarda sessão nem navega com credenciais inválidas", async () => {
    const { result } = await renderReady();
    const calls = recordRequests();

    await expect(
      act(async () => {
        await result.current.login(CREDENTIALS);
      }),
    ).rejects.toMatchObject({ response: { status: 401, data: { error: "INVALID_CREDENTIALS" } } });

    expect(signatures(calls)).toEqual(["POST /auth/login"]);
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });
});

describe("useAuth: logout", () => {
  it("encerra a sessão no servidor, limpa o estado local e manda para o login", async () => {
    loginAs(USER);
    const { result } = await renderReady();
    const calls = recordRequests();

    await act(async () => {
      await result.current.logout();
    });

    expect(signatures(calls)).toEqual(["POST /auth/logout"]);
    expect(db.session).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("limpa o estado local e manda para o login mesmo com a API fora", async () => {
    loginAs(USER);
    mockNetworkError("post", "/auth/logout");
    const { result } = await renderReady();

    await act(async () => {
      await result.current.logout();
    });

    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });
});

describe("useAuth: sair de todos os dispositivos", () => {
  it("revoga todas as sessões, limpa o estado local e manda para o login", async () => {
    loginAs(USER);
    const { result } = await renderReady();
    const calls = recordRequests();

    await act(async () => {
      await result.current.logoutAll();
    });

    expect(signatures(calls)).toEqual(["POST /auth/logout-all"]);
    expect(db.session).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });

  it("com o access token vencido, renova e repete a chamada", async () => {
    loginAs(USER);
    const { result } = await renderReady();
    // O token da aba deixa de valer; o refresh do servidor continua.
    setSession("access-vencido");
    const calls = recordRequests();

    await act(async () => {
      await result.current.logoutAll();
    });

    expect(signatures(calls)).toEqual([
      "POST /auth/logout-all",
      "POST /auth/refresh",
      "POST /auth/logout-all",
    ]);
    expect(db.session).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("limpa o estado local e manda para o login mesmo com a API fora", async () => {
    loginAs(USER);
    mockNetworkError("post", "/auth/logout-all");
    const { result } = await renderReady();
    const calls = recordRequests();

    await act(async () => {
      await result.current.logoutAll();
    });

    expect(signatures(calls)).toEqual(["POST /auth/logout-all"]);
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
    expect(redirectToLogin).toHaveBeenCalledTimes(1);
  });
});
