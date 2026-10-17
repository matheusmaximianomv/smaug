import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import {
  makeCategory,
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useExpenseMonth } from "./useExpenseMonth";

const MORADIA = makeCategory({ name: "Moradia" });
const ELETRONICOS = makeCategory({ name: "Eletrônicos" });

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

function setup(month = 9) {
  return renderHookWithProviders(() => useExpenseMonth({ year: 2026, month }));
}

describe("useExpenseMonth: grupos", () => {
  it("usa a query key [expenses, month, ano, mês]", async () => {
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["expenses", "month", 2026, 9])).toBeDefined();
  });

  it("ordena Recorrentes · Parceladas · Avulsas e omite grupos vazios", async () => {
    seedDb({
      oneTimeExpenses: [
        makeOneTimeExpense({ description: "Farmácia", category: MORADIA, amount: 50 }),
      ],
      recurringExpenses: [
        makeRecurringExpense({
          currentVersion: makeRecurringExpenseVersion({
            category: MORADIA,
            effectiveYear: 2026,
            effectiveMonth: 1,
          }),
        }),
      ],
    });
    const { result } = setup();

    await waitFor(() => expect(result.current.ledger).toBeDefined());
    const ledger = result.current.ledger!;

    expect(ledger.groups.map((g) => g.title)).toEqual(["Recorrentes", "Avulsas"]);
    expect(ledger.count).toBe(2);
    expect(ledger.total).toBe(2250);
    expect(ledger.status).toBe("current");
    expect(ledger.totalLabel).toBe("Total previsto");
    expect(ledger.segments.map((s) => [s.label, s.amount])).toEqual([
      ["Recorrentes", 2200],
      ["Parceladas", 0],
      ["Avulsas", 50],
    ]);
  });

  it('rotula o mês passado como "Total gasto"', async () => {
    seedDb({ oneTimeExpenses: [makeOneTimeExpense({ competenceMonth: 8 })] });
    const { result } = setup(8);

    await waitFor(() => expect(result.current.ledger).toBeDefined());

    expect(result.current.ledger!.status).toBe("past");
    expect(result.current.ledger!.totalLabel).toBe("Total gasto");
  });
});

describe("useExpenseMonth: linhas", () => {
  it("monta o subtítulo, a sublegenda e o progresso da parcelada", async () => {
    seedDb({
      installmentExpenses: [
        makeInstallmentExpense({
          description: "Notebook",
          category: ELETRONICOS,
          startYear: 2026,
          startMonth: 7,
          installmentCount: 12,
          totalAmount: 4800,
        }),
      ],
    });
    const { result } = setup();

    await waitFor(() => expect(result.current.ledger).toBeDefined());
    const [row] = result.current.ledger!.groups[0].rows;

    expect(row.subtitle).toEqual(["Eletrônicos", "Parcela 3 de 12", "termina Jun/27"]);
    expect(row.amountCaption).toBe("de R$ 4.800,00");
    expect(row.progress).toEqual({ current: 3, total: 12 });
    expect(row.kind).toBe("parcelada");
  });

  it("descreve a recorrente com início, término e o valor anterior no mês do reajuste", async () => {
    const v1 = makeRecurringExpenseVersion({
      category: MORADIA,
      amount: 100,
      effectiveYear: 2026,
      effectiveMonth: 1,
    });
    const v2 = makeRecurringExpenseVersion({
      category: MORADIA,
      amount: 120,
      effectiveYear: 2026,
      effectiveMonth: 9,
    });
    seedDb({
      recurringExpenses: [
        makeRecurringExpense({
          startYear: 2026,
          startMonth: 1,
          currentVersion: v2,
          versions: [v1, v2],
        }),
        makeRecurringExpense({
          startYear: 2026,
          startMonth: 3,
          endYear: 2026,
          endMonth: 12,
          currentVersion: makeRecurringExpenseVersion({
            category: MORADIA,
            effectiveYear: 2026,
            effectiveMonth: 3,
          }),
        }),
      ],
    });
    const { result } = setup();

    await waitFor(() => expect(result.current.ledger).toBeDefined());
    const [adjusted, bounded] = result.current.ledger!.groups[0].rows;

    expect(adjusted.subtitle).toEqual(["Moradia", "desde Jan/26", "sem término"]);
    expect(adjusted.previousAmount).toBe(100);
    expect(adjusted.amountCaption).toBe("por mês");
    expect(bounded.subtitle).toEqual(["Moradia", "desde Mar/26", "até Dez/26"]);
    expect(bounded.previousAmount).toBeNull();
  });

  it("descreve a avulsa só pela categoria", async () => {
    seedDb({ oneTimeExpenses: [makeOneTimeExpense({ category: MORADIA })] });
    const { result } = setup();

    await waitFor(() => expect(result.current.ledger).toBeDefined());
    const [row] = result.current.ledger!.groups[0].rows;

    expect(row).toMatchObject({
      kind: "avulsa",
      subtitle: ["Moradia"],
      previousAmount: null,
    });
    expect(row.amountCaption).toBeUndefined();
  });
});
