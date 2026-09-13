import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { createTestQueryClient, renderHookWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import type { HistoricoFilter } from "../types";
import { useVersionHistory } from "./useVersionHistory";

/** Uma receita fixa em setembro e uma despesa recorrente em outubro. */
function seedTwoMonths() {
  const rv = makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 9 });
  const ev = makeRecurringExpenseVersion({ effectiveYear: 2026, effectiveMonth: 10 });
  seedDb({
    fixedRevenues: [makeFixedRevenue({ currentVersion: rv, versions: [rv] })],
    recurringExpenses: [makeRecurringExpense({ currentVersion: ev, versions: [ev] })],
  });
}

function setup(filter: HistoricoFilter = "all") {
  const queryClient = createTestQueryClient();
  const rendered = renderHookWithProviders(
    ({ filter: f }: { filter: HistoricoFilter }) => useVersionHistory(f),
    { queryClient, initialProps: { filter } },
  );
  return { ...rendered, queryClient };
}

describe("useVersionHistory", () => {
  it("usa a chave ['version-history'] com staleTime de 30 s", async () => {
    const { queryClient, result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const query = queryClient.getQueryCache().find({ queryKey: ["version-history"] })!;

    expect(query).toBeDefined();
    expect(query.observers[0].options.staleTime).toBe(30_000);
  });

  it('o filtro "all" devolve todos os grupos', async () => {
    seedTwoMonths();
    const { result } = setup("all");

    await waitFor(() => expect(result.current.groups).toHaveLength(2));

    expect(result.current.groups.flatMap((g) => g.entries).map((e) => e.type)).toEqual([
      "recurring-expense",
      "fixed-revenue",
    ]);
  });

  it('"fixed-revenues" mantém apenas entradas de receita fixa', async () => {
    seedTwoMonths();
    const { result } = setup("fixed-revenues");

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const entries = result.current.groups.flatMap((g) => g.entries);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("fixed-revenue");
  });

  it('"recurring-expenses" mantém apenas entradas de despesa recorrente', async () => {
    seedTwoMonths();
    const { result } = setup("recurring-expenses");

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const entries = result.current.groups.flatMap((g) => g.entries);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("recurring-expense");
  });

  it("remove os grupos que ficam sem entradas depois do filtro", async () => {
    seedTwoMonths();
    const { result } = setup("fixed-revenues");

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Outubro só tinha a despesa recorrente: o grupo inteiro some.
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]).toMatchObject({ year: 2026, month: 9 });
  });

  it("devolve groups vazio enquanto data é undefined", () => {
    const { result } = setup();

    expect(result.current.groups).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("expõe isLoading, error e refetch", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(typeof result.current.refetch).toBe("function");
  });

  it("expõe o erro quando a busca falha", async () => {
    mockApiError("get", "/revenues/fixed", 500, {});
    const { result } = setup();

    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.groups).toEqual([]);
  });

  it("trocar o filtro re-deriva sem novo request", async () => {
    seedTwoMonths();
    const calls = recordRequests();
    const { result, rerender } = setup("all");
    await waitFor(() => expect(result.current.groups).toHaveLength(2));
    const afterLoad = calls.length;

    rerender({ filter: "recurring-expenses" });

    expect(result.current.groups).toHaveLength(1);
    expect(calls).toHaveLength(afterLoad);
  });
});
