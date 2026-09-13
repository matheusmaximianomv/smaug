import { describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { spyOnToast } from "../../../tests/toast";
import { mockApiError, seedDb } from "../../../tests/msw";
import { makeCategoryWithCount, makeInstallmentExpense } from "../../../tests/fixtures";
import { recordRequests, signatures } from "../../../tests/requests";
import { useInstallments } from "./useInstallments";

const QK = ["expenses", "installment"];

const PAYLOAD = {
  description: "Notebook",
  totalAmount: 3600,
  installmentCount: 12,
  categoryId: "cat-001",
  startYear: 2026,
  startMonth: 9,
};

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useInstallments(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useInstallments: query", () => {
  it("usa a chave ['expenses','installment'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient.getQueryCache().find({ queryKey: QK })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it("busca a lista em /expenses/installment", async () => {
    seedDb({ installmentExpenses: [makeInstallmentExpense()] });
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /expenses/installment"]);
    expect(result.current.data).toHaveLength(1);
  });

  it("expõe apenas create e remove: parcelamento não tem update", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(typeof result.current.create.mutate).toBe("function");
    expect(typeof result.current.remove.mutate).toBe("function");
    expect(result.current).not.toHaveProperty("update");
  });
});

describe("useInstallments: create", () => {
  it("invalida a query e avisa o sucesso", async () => {
    seedDb({ categories: [makeCategoryWithCount()] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.create.mutate(PAYLOAD));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Parcelamento criado!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro e o retry redispara", async () => {
    mockApiError("post", "/expenses/installment", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.create.mutate(PAYLOAD));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao criar parcelamento.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(2);
  });
});

describe("useInstallments: remove", () => {
  it("invalida a query e avisa o sucesso", async () => {
    const expense = makeInstallmentExpense();
    seedDb({ installmentExpenses: [expense] });
    const { result, invalidateQueries, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate(expense.id));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Parcelamento excluído!"));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: QK });
  });

  it("avisa o erro de parcelas em meses passados", async () => {
    mockApiError("delete", "/expenses/installment/parc-1", 409, {
      error: "INSTALLMENT_HAS_PAST_COMPETENCE",
    });
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    act(() => result.current.remove.mutate("parc-1"));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Este parcelamento já possui parcelas em meses passados e não pode ser excluído.",
        expect.anything(),
      ),
    );
  });

  it("usa o fallback e o retry redispara com o mesmo id", async () => {
    mockApiError("delete", "/expenses/installment/parc-1", 500, {});
    const { result, toast } = setup();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calls = recordRequests();

    act(() => result.current.remove.mutate("parc-1"));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Erro ao excluir parcelamento.", expect.anything()),
    );

    retryFromToast(toast);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(2));
    expect(calls.filter((c) => c.path === "/expenses/installment/parc-1")).toHaveLength(2);
  });
});
