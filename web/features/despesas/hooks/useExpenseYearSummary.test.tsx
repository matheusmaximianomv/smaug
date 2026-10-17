import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import { makeOneTimeExpense } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useExpenseYearSummary } from "./useExpenseYearSummary";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

describe("useExpenseYearSummary: células da faixa", () => {
  it("devolve o total de cada mês, nulo onde não há lançamento", async () => {
    seedDb({
      oneTimeExpenses: [
        makeOneTimeExpense({ competenceMonth: 3, amount: 3420.5 }),
        makeOneTimeExpense({ competenceMonth: 9, amount: 10 }),
      ],
    });
    const { result, queryClient } = renderHookWithProviders(() => useExpenseYearSummary(2026));

    expect(result.current.totals).toEqual([]);
    await waitFor(() => expect(result.current.totals).toHaveLength(12));

    expect(result.current.totals[2]).toBe(3420.5);
    expect(result.current.totals[8]).toBe(10);
    expect(result.current.totals[0]).toBeNull();
    expect(queryClient.getQueryData(["expenses", "summary", 2026])).toBeDefined();
  });
});
