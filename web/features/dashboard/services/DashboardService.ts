import { apiClient } from "@/infra/api-client";
import { addMonths, getCompetenceStatus, getCurrentCompetence } from "@/shared/lib/competence";
import type { DashboardData, RevenueListItem, ExpenseListItem, CategoryBreakdown } from "../types";

interface RevenueQueryResponse {
  competenceYear: number;
  competenceMonth: number;
  oneTimeRevenues: { id: string; description: string; amount: number }[];
  /** Descrição e valor da receita fixa ficam na versão vigente, não na raiz do registro. */
  fixedRevenues: {
    id: string;
    modality: string;
    currentVersion: { description: string; amount: number };
  }[];
  totals: { oneTimeTotal: number; fixedTotal: number; total: number };
}

interface ExpenseQueryResponse {
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

async function fetchMonth(year: number, month: number) {
  const params = { competenceYear: year, competenceMonth: month };
  const [revRes, expRes] = await Promise.all([
    apiClient.get<RevenueQueryResponse>("/revenues", { params }),
    apiClient.get<ExpenseQueryResponse>("/expenses", { params }),
  ]);
  return { rev: revRes.data, exp: expRes.data };
}

export const DashboardService = {
  getByMonth: async (year: number, month: number): Promise<DashboardData> => {
    const current = getCurrentCompetence();
    const { year: currentYear, month: currentMonth } = current;

    // Fetch selected month + 6 chart months (centered on today) in parallel
    const chartOffsets = [-3, -2, -1, 0, 1, 2];
    const chartMonthDates = chartOffsets.map((o) => addMonths(current, o));

    const isSelectedInChart = chartMonthDates.some((m) => m.year === year && m.month === month);
    const fetchTargets = isSelectedInChart
      ? chartMonthDates
      : [...chartMonthDates, { year, month }];

    const results = await Promise.all(fetchTargets.map((m) => fetchMonth(m.year, m.month)));

    const selectedIdx = fetchTargets.findIndex((m) => m.year === year && m.month === month);
    const { rev, exp } = results[selectedIdx];

    // KPIs
    const totalRevenues = rev.totals.total;
    const totalExpenses = exp.totals.total;

    // Revenue list
    const recentRevenues: RevenueListItem[] = [
      ...rev.oneTimeRevenues.map((r) => ({
        id: r.id,
        type: "ONE_TIME" as const,
        description: r.description,
        amount: r.amount,
      })),
      ...rev.fixedRevenues.map((r) => ({
        id: r.id,
        type: "FIXED" as const,
        description: r.currentVersion.description,
        amount: r.currentVersion.amount,
      })),
    ];

    // Expense list
    const recentExpenses: ExpenseListItem[] = exp.expenses.map((e) => ({
      id: e.id,
      type: e.type,
      description: e.description,
      amount: e.amount,
      categoryName: e.category?.name,
    }));

    // Category breakdown
    const catMap = new Map<string, { name: string; amount: number }>();
    for (const e of exp.expenses) {
      const key = e.category?.id ?? "sem-categoria";
      const name = e.category?.name ?? "Sem categoria";
      const prev = catMap.get(key) ?? { name, amount: 0 };
      catMap.set(key, { name, amount: prev.amount + e.amount });
    }
    const categories: CategoryBreakdown[] = Array.from(catMap.entries()).map(([id, v]) => ({
      categoryId: id,
      categoryName: v.name,
      amount: v.amount,
      percentage: totalExpenses > 0 ? (v.amount / totalExpenses) * 100 : 0,
    }));

    // Chart months
    const chartMonths = chartMonthDates.map((cm, i) => {
      const r = results[i];
      return {
        year: cm.year,
        month: cm.month,
        revenues: r?.rev.totals.total ?? 0,
        expenses: r?.exp.totals.total ?? 0,
      };
    });

    return {
      competence: { year, month },
      status: getCompetenceStatus({ year, month }, current),
      kpis: { totalRevenues, totalExpenses, balance: totalRevenues - totalExpenses },
      chart: { months: chartMonths },
      breakdown: { categories, total: totalExpenses },
      recentRevenues,
      recentExpenses,
    };
  },
};
