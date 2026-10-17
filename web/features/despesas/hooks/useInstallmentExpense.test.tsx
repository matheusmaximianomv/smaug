import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import { makeInstallmentExpense } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { toInstallmentSummary, useInstallmentExpense } from "./useInstallmentExpense";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

describe("useInstallmentExpense: detalhe", () => {
  it("busca o parcelamento por id e resume pago, restante e parcela atual", async () => {
    const expense = makeInstallmentExpense({
      startYear: 2026,
      startMonth: 8,
      totalAmount: 100,
      installmentCount: 3,
    });
    seedDb({ installmentExpenses: [expense] });
    const { result, queryClient } = renderHookWithProviders(() =>
      useInstallmentExpense(expense.id),
    );

    await waitFor(() => expect(result.current.summary).toBeDefined());

    expect(queryClient.getQueryData(["expenses", "installment", expense.id])).toBeDefined();
    expect(result.current.summary).toEqual({
      paid: { amount: 33.34, label: "1 parcela" },
      remaining: { amount: 66.66, label: "2 parcelas" },
      current: "2/3",
      end: "Out/26",
      range: "Ago/26 → Out/26",
      progress: 1 / 3,
      lastAmount: 33.33,
    });
  });

  it("mostra — sem parcela atual e trata a lista vazia", () => {
    const expense = makeInstallmentExpense({
      startYear: 2026,
      startMonth: 10,
      installmentCount: 2,
    });

    expect(toInstallmentSummary(expense)).toMatchObject({ current: "—", progress: 0 });
    expect(toInstallmentSummary({ ...expense, installments: [] })).toMatchObject({
      lastAmount: 0,
      progress: 0,
      paid: { amount: 0, label: "0 parcelas" },
    });
  });
});
