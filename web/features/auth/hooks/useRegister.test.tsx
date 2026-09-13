import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { http, HttpResponse } from "msw";
import { mockApiError, seedDb, server, url } from "../../../tests/msw";
import { makeUser } from "../../../tests/fixtures";
import { recordRequests, signatures } from "../../../tests/requests";
import { useRegister } from "./useRegister";

const INPUT = { name: "Maria Souza", email: "maria@example.com" };

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
  });

  it("chama AuthService.register via POST /users", async () => {
    const calls = recordRequests();
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(signatures(calls)).toEqual(["POST /users"]);
  });

  it("expõe isPending durante a chamada e o usuário criado em data", async () => {
    // Segura a resposta para que o estado intermediário seja observável.
    let release!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(url("/users"), async () => {
        await held;
        return HttpResponse.json(makeUser(INPUT), { status: 201 });
      }),
    );
    const { result } = setup();

    act(() => result.current.mutate(INPUT));
    await waitFor(() => expect(result.current.isPending).toBe(true));

    release();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.isPending).toBe(false);
    expect(result.current.data).toMatchObject(INPUT);
  });

  it("expõe o erro em error", async () => {
    seedDb({ users: [makeUser({ email: INPUT.email })] });
    const { result } = setup();

    act(() => result.current.mutate(INPUT));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toMatchObject({ response: { status: 409 } });
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
    mockApiError("post", "/users", 500, {});
    const { result, toast } = setup();

    act(() => result.current.mutate(INPUT));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toast.error).not.toHaveBeenCalled();
  });
});
