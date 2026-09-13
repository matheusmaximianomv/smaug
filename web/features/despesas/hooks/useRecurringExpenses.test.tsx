import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeCategoryWithCount, makeRecurringExpense } from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { useRecurringExpenses } from "./useRecurringExpenses";

const QK = ["expenses", "recurring"];

const CREATE_PAYLOAD = {
  description: "Aluguel",
  amount: 2200,
  categoryId: "cat-001",
  startYear: 2026,
  startMonth: 9,
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useRecurringExpenses(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useRecurringExpenses: query", () => {
  it("usa a chave ['expenses','recurring'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /expenses/recurring", async () => {
    seedDb({ recurringExpenses: [makeRecurringExpense()] });
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /expenses/recurring"]);
    expect(result.current.data).toHaveLength(1);
  });

  it("expõe as 4 mutations", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(typeof result.current.create.mutate).toBe("function");
    expect(typeof result.current.addVersion.mutate).toBe("function");
    expect(typeof result.current.terminate.mutate).toBe("function");
    expect(typeof result.current.remove.mutate).toBe("function");
  });
});

describe("useRecurringExpenses: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    seedDb({ categories: [makeCategoryWithCount()] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate(CREATE_PAYLOAD));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa recorrente criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("post", "/expenses/recurring", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate(CREATE_PAYLOAD));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao criar despesa recorrente.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
});

describe("useRecurringExpenses: addVersion", () => {
  const versionPayload = {
    description: "Aluguel",
    amount: 2500,
    categoryId: "cat-001",
    effectiveYear: 2026,
    effectiveMonth: 10,
  };

  it("desestrutura {id, ...payload} e faz PATCH na despesa", async () => {
    const expense = makeRecurringExpense();
    seedDb({ categories: [makeCategoryWithCount()], recurringExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.addVersion.mutate({ id: expense.id, ...versionPayload }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Nova versão criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PATCH /expenses/recurring/${expense.id}`);
    expect(await bodyOf(calls.find((c) => c.method === "PATCH")!)).toEqual(versionPayload);
  });

  it("avisa o erro e o retry redispara", async () => {
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.addVersion.mutate({ id: "recor-999", ...versionPayload }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Despesa recorrente não encontrada.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2);
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("patch", "/expenses/recurring/recor-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.addVersion.mutate({ id: "recor-1", ...versionPayload }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar versão.", expect.anything()),
    );
  });
});

describe("useRecurringExpenses: terminate", () => {
  const endPayload = { endYear: 2026, endMonth: 12 };

  it("desestrutura {id, ...payload} e chama a rota /terminate", async () => {
    const expense = makeRecurringExpense();
    seedDb({ recurringExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.terminate.mutate({ id: expense.id, ...endPayload }));

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Despesa recorrente encerrada!"),
    );
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PATCH /expenses/recurring/${expense.id}/terminate`);
    expect(await bodyOf(calls.find((c) => c.method === "PATCH")!)).toEqual(endPayload);
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("patch", "/expenses/recurring/recor-1/terminate", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.terminate.mutate({ id: "recor-1", ...endPayload }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao encerrar despesa recorrente.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PATCH")).toHaveLength(2);
  });
});

describe("useRecurringExpenses: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const expense = makeRecurringExpense();
    seedDb({ recurringExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(expense.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa recorrente excluída!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara com o mesmo id", async () => {
    mockApiError("delete", "/expenses/recurring/recor-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("recor-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao excluir despesa recorrente.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/expenses/recurring/recor-1")).toHaveLength(2);
  });
});
