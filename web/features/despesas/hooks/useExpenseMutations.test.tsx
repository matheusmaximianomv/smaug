import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import {
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
} from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import { spyOnToast } from "../../../tests/toast";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useExpenseMutations, type CreateExpenseInput } from "./useExpenseMutations";

const QK = ["expenses"];
const DASHBOARD = ["dashboard"];

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const onSuccess = vi.fn();
  const rendered = renderHookWithProviders(() => useExpenseMutations({ onSuccess }), {
    queryClient,
  });
  return { ...rendered, invalidateQueries, toast, onSuccess };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

const CREATES: [CreateExpenseInput, string][] = [
  [
    {
      kind: "avulsa",
      payload: {
        description: "Farmácia",
        amount: 50,
        categoryId: "c",
        competenceYear: 2026,
        competenceMonth: 9,
      },
    },
    "Despesa adicionada",
  ],
  [
    {
      kind: "parcelada",
      payload: {
        description: "Notebook",
        totalAmount: 100,
        installmentCount: 3,
        categoryId: "c",
        startYear: 2026,
        startMonth: 9,
      },
    },
    "Parcelamento criado",
  ],
  [
    {
      kind: "recorrente",
      payload: {
        description: "Academia",
        amount: 89.9,
        categoryId: "c",
        startYear: 2026,
        startMonth: 9,
      },
    },
    "Despesa recorrente criada",
  ],
];

describe("useExpenseMutations: create", () => {
  it.each(CREATES)("cria %# , invalida despesas e dashboard e avisa", async (input, message) => {
    const { result, invalidateQueries, toast, onSuccess } = setup();

    act(() => result.current.create.mutate(input));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: DASHBOARD });
    expect(onSuccess).toHaveBeenCalledWith("create");
  });

  it("mostra a mensagem pt-BR do erro e repete pelo toast, avisando o chamador no acerto", async () => {
    const { result, toast, onSuccess } = setup();
    const calls = recordRequests();
    mockApiError("post", "/expenses/one-time", 409, { error: "PAST_COMPETENCE" });

    act(() => result.current.create.mutate(CREATES[0][0]));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Não é possível alterar lançamentos de competências passadas.",
        expect.anything(),
      ),
    );
    expect(onSuccess).not.toHaveBeenCalled();

    retryFromToast(toast);

    await waitFor(() => expect(calls.filter((c) => c.method === "POST")).toHaveLength(2));
  });
});

describe("useExpenseMutations: demais ações", () => {
  it("atualiza a avulsa", async () => {
    const expense = makeOneTimeExpense();
    seedDb({ oneTimeExpenses: [expense] });
    const { result, toast, onSuccess } = setup();

    act(() =>
      result.current.updateOneTime.mutate({
        id: expense.id,
        description: "Mercado",
        amount: 10,
        categoryId: expense.categoryId,
        competenceYear: 2026,
        competenceMonth: 9,
      }),
    );

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa atualizada"));
    expect(onSuccess).toHaveBeenCalledWith("updateOneTime");
  });

  it.each([
    ["avulsa", "Despesa removida", "/expenses/one-time/x"],
    ["parcelada", "Parcelamento removido", "/expenses/installment/x"],
    ["recorrente", "Despesa removida", "/expenses/recurring/x"],
  ] as const)("remove %s com o toast certo", async (kind, message, path) => {
    const { result, toast } = setup();
    const calls = recordRequests();

    act(() => result.current.remove.mutate({ kind, id: "x" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(message));
    expect(calls[0]).toMatchObject({ method: "DELETE", path });
  });

  it("cria nova versão e encerra a recorrente", async () => {
    const expense = makeRecurringExpense();
    seedDb({ recurringExpenses: [expense] });
    const { result, toast, onSuccess } = setup();

    act(() =>
      result.current.addVersion.mutate({
        id: expense.id,
        description: "Aluguel",
        amount: 2500,
        categoryId: expense.currentVersion.categoryId,
        effectiveYear: 2026,
        effectiveMonth: 11,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nova versão criada"));

    act(() => result.current.terminate.mutate({ id: expense.id, endYear: 2026, endMonth: 12 }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa encerrada"));
    expect(onSuccess.mock.calls).toEqual([["addVersion"], ["terminate"]]);
  });

  it("encerra o parcelamento", async () => {
    const expense = makeInstallmentExpense({ startYear: 2026, startMonth: 8 });
    seedDb({ installmentExpenses: [expense] });
    const { result, toast, onSuccess } = setup();

    act(() => result.current.terminateInstallment.mutate(expense.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Parcelamento encerrado"));
    expect(onSuccess).toHaveBeenCalledWith("terminateInstallment");
  });

  it.each([
    ["updateOneTime", "put", "/expenses/one-time/x", "Erro ao atualizar despesa."],
    ["remove", "delete", "/expenses/one-time/x", "Erro ao remover despesa."],
    ["addVersion", "patch", "/expenses/recurring/x", "Erro ao criar nova versão."],
    ["terminate", "patch", "/expenses/recurring/x/terminate", "Erro ao encerrar despesa."],
    [
      "terminateInstallment",
      "post",
      "/expenses/installment/x/terminate",
      "Erro ao encerrar parcelamento.",
    ],
  ] as const)("%s cai no fallback e oferece repetir", async (name, method, path, fallback) => {
    const { result, toast } = setup();
    const calls = recordRequests();
    mockApiError(method, path, 500, {});
    const variables = {
      updateOneTime: {
        id: "x",
        description: "a",
        amount: 1,
        categoryId: "c",
        competenceYear: 2026,
        competenceMonth: 9,
      },
      remove: { kind: "avulsa", id: "x" },
      addVersion: {
        id: "x",
        description: "a",
        amount: 1,
        categoryId: "c",
        effectiveYear: 2026,
        effectiveMonth: 10,
      },
      terminate: { id: "x", endYear: 2026, endMonth: 10 },
      terminateInstallment: "x",
    }[name];

    act(() => (result.current[name].mutate as (v: unknown) => void)(variables));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(fallback, expect.anything()));
    retryFromToast(toast);

    await waitFor(() => expect(calls).toHaveLength(2));
  });

  it("funciona sem callback do chamador", async () => {
    const toast = spyOnToast();
    const { result } = renderHookWithProviders(() => useExpenseMutations());

    act(() => result.current.remove.mutate({ kind: "avulsa", id: "x" }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa removida"));
  });
});
