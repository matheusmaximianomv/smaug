import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { getAccessToken, hasSessionHint } from "@/infra/session";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb, server, url } from "../../../tests/msw";
import { openSession } from "../../../tests/msw/handlers/auth";
import { makeUser } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { routerAdapterMock } from "../../../tests/router";
import { useRegister } from "./useRegister";

vi.mock("@/infra/router-adapter", async () => {
  const { routerAdapterMock: router } = await import("../../../tests/router");
  return { useRouter: () => router };
});

const INPUT = { name: "Maria Souza", email: "maria@example.com", password: "senha muito segura" };

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useRegister(), { queryClient });
  return { ...rendered, invalidateQueries, toast };
}

describe("useRegister", () => {
  it("começa ocioso, sem data nem error", () => {
    const { result } = setup();

    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isEmailTaken).toBe(false);
  });

  it("chama AuthService.register via POST /auth/register com a senha", async () => {
    const calls = recordRequests();
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(signatures(calls)).toEqual(["POST /auth/register"]);
    expect(await bodyOf(calls[0])).toEqual(INPUT);
  });

  it("no sucesso abre a sessão e leva ao dashboard, sem etapa de login", async () => {
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAccessToken()).toBe(result.current.data!.accessToken);
    expect(hasSessionHint()).toBe(true);
    expect(routerAdapterMock.push).toHaveBeenCalledWith("/dashboard");
  });

  it("expõe isPending durante a chamada", async () => {
    // Segura a resposta para que o estado intermediário seja observável.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(url("/auth/register"), async () => {
        await held;
        return HttpResponse.json(openSession(makeUser(INPUT)), { status: 201 });
      }),
    );
    const { result } = setup();

    act(() => result.current.mutate(INPUT));
    await waitFor(() => expect(result.current.isPending).toBe(true));

    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
  });

  it("no 409 expõe o erro e sinaliza o e-mail já cadastrado, sem abrir sessão", async () => {
    seedDb({ users: [makeUser({ email: INPUT.email })] });
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ response: { status: 409 } });
    expect(result.current.isEmailTaken).toBe(true);
    expect(getAccessToken()).toBeNull();
    expect(routerAdapterMock.push).not.toHaveBeenCalled();
  });

  it("outros erros não sinalizam e-mail já cadastrado", async () => {
    mockApiError("post", "/auth/register", 429, { error: "TOO_MANY_REQUESTS" });
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isEmailTaken).toBe(false);
  });

  it("NÃO dispara toast nem invalidação: é a exceção ao padrão dos hooks", async () => {
    const { result, invalidateQueries, toast } = setup();

    act(() => result.current.mutate(INPUT));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateQueries).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("também não dispara toast no erro", async () => {
    mockApiError("post", "/auth/register", 500, {});
    const { result, toast } = setup();

    act(() => result.current.mutate(INPUT));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).not.toHaveBeenCalled();
  });
});
