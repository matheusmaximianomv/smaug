import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import {
  makeCategory,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { toSeriesModel, useRecurringExpense } from "./useRecurringExpense";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

describe("useRecurringExpense: detalhe", () => {
  it("busca a recorrente por id e a normaliza como série", async () => {
    const moradia = makeCategory({ name: "Moradia" });
    const v1 = makeRecurringExpenseVersion({
      category: moradia,
      amount: 100,
      effectiveYear: 2026,
      effectiveMonth: 1,
    });
    const v2 = makeRecurringExpenseVersion({
      category: moradia,
      amount: 120,
      effectiveYear: 2026,
      effectiveMonth: 11,
    });
    const expense = makeRecurringExpense({
      startYear: 2026,
      startMonth: 1,
      endYear: 2027,
      endMonth: 6,
      currentVersion: v2,
      versions: [v2, v1],
    });
    seedDb({ recurringExpenses: [expense] });
    const { result, queryClient } = renderHookWithProviders(() => useRecurringExpense(expense.id));

    await waitFor(() => expect(result.current.series).toBeDefined());

    expect(queryClient.getQueryData(["expenses", "recurring", expense.id])).toBeDefined();
    expect(result.current.series).toMatchObject({
      start: { year: 2026, month: 1 },
      end: { year: 2027, month: 6 },
      isExpired: false,
      reference: { year: 2026, month: 9 },
      currentVersionId: v1.id,
      allowsVersions: true,
    });
    expect(result.current.series!.versions.map((v) => [v.amount, v.categoryName])).toEqual([
      [100, "Moradia"],
      [120, "Moradia"],
    ]);
  });

  it("usa a versão vigente quando a resposta não traz a lista e aceita série sem término", () => {
    const expense = makeRecurringExpense({ versions: undefined });

    const series = toSeriesModel(expense);

    expect(series.end).toBeNull();
    expect(series.versions).toHaveLength(1);
  });
});
