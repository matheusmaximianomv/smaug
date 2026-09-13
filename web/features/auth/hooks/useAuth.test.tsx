import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { getUserId } from "@/infra/session";
import { mockApiError, mockNetworkError, seedDb } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { loginAs } from "../../../tests/session";
import { recordRequests, signatures } from "../../../tests/requests";
import { routerAdapterMock } from "../../../tests/router";
import { AuthService } from "../services/AuthService";
import { useAuth } from "./useAuth";

// Silencia o "Not implemented: navigation" do jsdom no caminho de 401.
vi.mock("@/infra/navigation", () => ({ redirectToLogin: vi.fn() }));

/**
 * `@/infra/session` fica REAL: o cookie é o assunto de metade dos ramos. Só o
 * roteamento é duplo.
 */
vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const USER = makeUser({ name: "Maria Souza" });

describe("useAuth: mount sem cookie", () => {
  it("termina o carregamento sem autenticar e sem chamar a API", async () => {
    const getUserById = vi.spyOn(AuthService, "getUserById");
    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(getUserById).not.toHaveBeenCalled();
  });
});

describe("useAuth: mount com cookie", () => {
  it("carrega o perfil e autentica", async () => {
    seedDb({ users: [USER] });
    loginAs(USER.id);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toMatchObject({ name: "Maria Souza" });
    expect(result.current.userId).toBe(USER.id);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("roda o efeito de mount uma única vez, mesmo com re-renders", async () => {
    seedDb({ users: [USER] });
    loginAs(USER.id);
    const calls = recordRequests();

    const { result, rerender } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender();
    rerender();

    expect(signatures(calls)).toEqual([`GET /users/${USER.id}`]);
  });
});

describe("useAuth: sessão inválida", () => {
  it.each([401, 404])("limpa o cookie no %i sem expor erro", async (status) => {
    loginAs(USER.id);
    mockApiError("get", `/users/${USER.id}`, status, { error: "USER_NOT_FOUND" });

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(getUserId()).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe("useAuth: falha transitória", () => {
  it("mantém a sessão no 500 e expõe a mensagem de perfil indisponível", async () => {
    loginAs(USER.id);
    mockApiError("get", `/users/${USER.id}`, 500, {});

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.userId).toBe(USER.id);
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe(
      "Não foi possível carregar seu perfil. Tente novamente em instantes.",
    );
    expect(getUserId()).toBe(USER.id);
  });

  it("mantém a sessão numa falha de rede", async () => {
    loginAs(USER.id);
    mockNetworkError("get", `/users/${USER.id}`);

    const { result } = renderHook(() => useAuth());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.error).toBe(
      "Não foi possível carregar seu perfil. Tente novamente em instantes.",
    );
    expect(getUserId()).toBe(USER.id);
  });
});

describe("useAuth: login", () => {
  it("valida o id antes de gravar o cookie e leva ao dashboard", async () => {
    seedDb({ users: [USER] });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login(USER.id);
    });

    expect(getUserId()).toBe(USER.id);
    expect(result.current.user).toMatchObject({ name: "Maria Souza" });
    expect(result.current.isAuthenticated).toBe(true);
    expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("rejeita para cima e não grava cookie nem navega quando o id não existe", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login("00000000-0000-4000-8000-000000000099");
      }),
    ).rejects.toMatchObject({ response: { status: 404 } });

    expect(getUserId()).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });
});

describe("useAuth: logout", () => {
  it("limpa o cookie, zera o estado e leva ao login", async () => {
    seedDb({ users: [USER] });
    loginAs(USER.id);
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    act(() => result.current.logout());

    expect(getUserId()).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.userId).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(routerAdapterMock.push).toHaveBeenCalledWith("/login");
  });
});
