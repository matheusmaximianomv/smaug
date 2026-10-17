import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeFixedRevenue, makeOneTimeRevenue } from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import { spyOnToast } from "../../../tests/toast";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useRevenueMutations } from "./useRevenueMutations";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const onSuccess = vi.fn();
  const rendered = renderHookWithProviders(() => useRevenueMutations({ onSuccess }), {
    queryClient,
  });
  return { ...rendered, invalidateQueries, toast, onSuccess };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => options!.action!.onClick());
}

describe("useRevenueMutations: create", () => {
  it.each([
    [
      {
        kind: "avulsa" as const,
        payload: { description: "Freela", amount: 800, competenceYear: 2026, competenceMonth: 9 },
      },
      "Receita adicionada",
    ],
    [
      {
        kind: "fixa" as const,
        payload: {
          description: "Salário",
          amount: 5000,
          modality: "ALTERABLE" as const,
          startYear: 2026,
          startMonth: 9,
        },
      },
      "Receita fixa criada",
    ],
  ])("cria e invalida receitas e dashboard (%#)", async (input, message) => {
    const { result, invalidateQueries, toast, onSuccess } = setup();

    act(() => result.current.create.mutate(input));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["revenues"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["dashboard"] });
    expect(onSuccess).toHaveBeenCalledWith("create");
  });
});

describe("useRevenueMutations: demais ações", () => {
  it("atualiza, versiona, encerra e remove com os toasts do PRD", async () => {
    const oneTime = makeOneTimeRevenue();
    const fixed = makeFixedRevenue();
    seedDb({ oneTimeRevenues: [oneTime], fixedRevenues: [fixed] });
    const { result, toast, onSuccess } = setup();

    act(() =>
      result.current.updateOneTime.mutate({
        id: oneTime.id,
        description: "x",
        amount: 1,
        competenceYear: 2026,
        competenceMonth: 9,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita atualizada"));

    act(() =>
      result.current.addVersion.mutate({
        id: fixed.id,
        description: "Salário",
        amount: 9000,
        effectiveYear: 2026,
        effectiveMonth: 11,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nova versão criada"));

    act(() => result.current.terminate.mutate({ id: fixed.id, endYear: 2026, endMonth: 12 }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita encerrada"));

    act(() => result.current.remove.mutate({ kind: "fixa", id: fixed.id }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("remove"));
    expect(toast.success).toHaveBeenCalledWith("Receita removida");
    expect(onSuccess.mock.calls.map(([a]) => a)).toEqual([
      "updateOneTime",
      "addVersion",
      "terminate",
      "remove",
    ]);
  });

  it("remove avulsa por DELETE /revenues/one-time/:id", async () => {
    const calls = recordRequests();
    const { result } = setup();

    act(() => result.current.remove.mutate({ kind: "avulsa", id: "rev-9" }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]).toMatchObject({ method: "DELETE", path: "/revenues/one-time/rev-9" });
  });

  it.each([
    [
      "create",
      "post",
      "/revenues/one-time",
      "Erro ao salvar receita.",
      {
        kind: "avulsa",
        payload: { description: "a", amount: 1, competenceYear: 2026, competenceMonth: 9 },
      },
    ],
    [
      "updateOneTime",
      "put",
      "/revenues/one-time/x",
      "Erro ao atualizar receita.",
      { id: "x", description: "a", amount: 1, competenceYear: 2026, competenceMonth: 9 },
    ],
    [
      "remove",
      "delete",
      "/revenues/fixed/x",
      "Erro ao remover receita.",
      { kind: "fixa", id: "x" },
    ],
    [
      "addVersion",
      "patch",
      "/revenues/fixed/x",
      "Erro ao criar nova versão.",
      { id: "x", description: "a", amount: 1, effectiveYear: 2026, effectiveMonth: 10 },
    ],
    [
      "terminate",
      "patch",
      "/revenues/fixed/x/terminate",
      "Erro ao encerrar receita.",
      { id: "x", endYear: 2026, endMonth: 10 },
    ],
  ] as const)(
    "%s cai no fallback e repete pelo toast",
    async (name, method, path, fallback, variables) => {
      const { result, toast } = setup();
      const calls = recordRequests();
      mockApiError(method, path, 500, {});

      act(() => (result.current[name].mutate as (v: unknown) => void)(variables));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(fallback, expect.anything()));
      retryFromToast(toast);

      await waitFor(() => expect(calls).toHaveLength(2));
    },
  );

  it("funciona sem callback do chamador", async () => {
    const toast = spyOnToast();
    const { result } = renderHookWithProviders(() => useRevenueMutations());

    act(() => result.current.remove.mutate({ kind: "avulsa", id: "x" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Receita removida"));
  });
});
