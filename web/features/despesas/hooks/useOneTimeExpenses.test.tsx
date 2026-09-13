import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeCategoryWithCount, makeOneTimeExpense } from "../../../tests/fixtures";
import { recordRequests, signatures } from "../../../tests/requests";
import { useOneTimeExpenses } from "./useOneTimeExpenses";

const QK = ["expenses", "one-time"];

const PAYLOAD = {
  description: "Supermercado",
  amount: 450,
  categoryId: "cat-001",
  competenceYear: 2026,
  competenceMonth: 9,
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useOneTimeExpenses(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useOneTimeExpenses: query", () => {
  it("usa a chave ['expenses','one-time'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /expenses/one-time", async () => {
    seedDb({ oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado" })] });
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /expenses/one-time"]);
    expect(result.current.data?.[0].description).toBe("Supermercado");
  });
});

describe("useOneTimeExpenses: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    seedDb({ categories: [makeCategoryWithCount()] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate(PAYLOAD));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa avulsa criada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("post", "/expenses/one-time", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate(PAYLOAD));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar despesa avulsa.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
});

describe("useOneTimeExpenses: update", () => {
  it("desestrutura {id, ...payload} e avisa o sucesso", async () => {
    const expense = makeOneTimeExpense();
    seedDb({ oneTimeExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.update.mutate({ id: expense.id, ...PAYLOAD }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa avulsa atualizada!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
    expect(signatures(calls)).toContain(`PUT /expenses/one-time/${expense.id}`);
  });

  it("avisa o erro e o retry redispara", async () => {
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.update.mutate({ id: "exp-999", ...PAYLOAD }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Despesa não encontrada.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "PUT")).toHaveLength(2);
  });

  it("usa o fallback quando o erro não tem código mapeado", async () => {
    mockApiError("put", "/expenses/one-time/exp-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.update.mutate({ id: "exp-1", ...PAYLOAD }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao atualizar despesa avulsa.",
        expect.anything(),
      ),
    );
  });
});

describe("useOneTimeExpenses: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const expense = makeOneTimeExpense();
    seedDb({ oneTimeExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(expense.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Despesa avulsa excluída!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara com o mesmo id", async () => {
    mockApiError("delete", "/expenses/one-time/exp-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("exp-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Erro ao excluir despesa avulsa.",
        expect.anything(),
      ),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/expenses/one-time/exp-1")).toHaveLength(2);
  });
});
