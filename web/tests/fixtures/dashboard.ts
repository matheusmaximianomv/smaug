/**
 * Formas dos dois payloads consolidados que o DashboardService consome.
 * As interfaces equivalentes são privadas em
 * `features/dashboard/services/DashboardService.ts` (RevenueQueryResponse /
 * ExpenseQueryResponse); replicadas aqui para as fixtures não dependerem de um
 * export que não existe.
 */

export interface RevenueQueryPayload {
  competenceYear: number;
  competenceMonth: number;
  oneTimeRevenues: { id: string; description: string; amount: number }[];
  fixedRevenues: {
    id: string;
    modality: string;
    currentVersion: { description: string; amount: number };
  }[];
  totals: { oneTimeTotal: number; fixedTotal: number; total: number };
}

export interface ExpenseQueryPayload {
  competenceYear: number;
  competenceMonth: number;
  expenses: {
    id: string;
    type: "ONE_TIME" | "INSTALLMENT" | "RECURRING";
    description: string;
    amount: number;
    category: { id: string; name: string };
  }[];
  totals: { oneTime: number; installment: number; recurring: number; total: number };
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

export function makeRevenueQueryPayload(o: Partial<RevenueQueryPayload> = {}): RevenueQueryPayload {
  const oneTimeRevenues = o.oneTimeRevenues ?? [];
  const fixedRevenues = o.fixedRevenues ?? [];
  const oneTimeTotal = sum(oneTimeRevenues.map((r) => r.amount));
  const fixedTotal = sum(fixedRevenues.map((r) => r.currentVersion.amount));
  return {
    competenceYear: 2026,
    competenceMonth: 9,
    ...o,
    oneTimeRevenues,
    fixedRevenues,
    totals: o.totals ?? { oneTimeTotal, fixedTotal, total: oneTimeTotal + fixedTotal },
  };
}

export function makeExpenseQueryPayload(o: Partial<ExpenseQueryPayload> = {}): ExpenseQueryPayload {
  const expenses = o.expenses ?? [];
  const by = (t: string) => sum(expenses.filter((e) => e.type === t).map((e) => e.amount));
  return {
    competenceYear: 2026,
    competenceMonth: 9,
    ...o,
    expenses,
    totals: o.totals ?? {
      oneTime: by("ONE_TIME"),
      installment: by("INSTALLMENT"),
      recurring: by("RECURRING"),
      total: sum(expenses.map((e) => e.amount)),
    },
  };
}
