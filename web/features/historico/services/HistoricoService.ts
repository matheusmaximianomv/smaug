import { apiClient } from "@/infra/api-client";
import type { FixedRevenue } from "@/features/receitas/types";
import type { RecurringExpense } from "@/features/despesas/types";
import type { VersionHistoryEntry, VersionHistoryGroup } from "../types";

async function fetchAll(): Promise<{
  fixedRevenues: FixedRevenue[];
  recurringExpenses: RecurringExpense[];
}> {
  const [fixedRes, recurringRes] = await Promise.all([
    apiClient.get<FixedRevenue[]>("/revenues/fixed"),
    apiClient.get<RecurringExpense[]>("/expenses/recurring"),
  ]);
  return { fixedRevenues: fixedRes.data, recurringExpenses: recurringRes.data };
}

function toEntries(
  fixedRevenues: FixedRevenue[],
  recurringExpenses: RecurringExpense[],
): VersionHistoryEntry[] {
  const entries: VersionHistoryEntry[] = [];

  for (const rev of fixedRevenues) {
    for (const ver of rev.versions) {
      entries.push({
        id: ver.id,
        parentId: rev.id,
        parentDescription: ver.description,
        type: "fixed-revenue",
        description: ver.description,
        amount: ver.amount,
        effectiveYear: ver.effectiveYear,
        effectiveMonth: ver.effectiveMonth,
        modality: rev.modality,
        createdAt: ver.createdAt,
      });
    }
  }

  for (const exp of recurringExpenses) {
    for (const ver of exp.versions) {
      entries.push({
        id: ver.id,
        parentId: exp.id,
        parentDescription: ver.description,
        type: "recurring-expense",
        description: ver.description,
        amount: ver.amount,
        effectiveYear: ver.effectiveYear,
        effectiveMonth: ver.effectiveMonth,
        categoryName: ver.category?.name,
        createdAt: ver.createdAt,
      });
    }
  }

  return entries;
}

function groupByMonth(entries: VersionHistoryEntry[]): VersionHistoryGroup[] {
  const map = new Map<string, VersionHistoryEntry[]>();

  for (const entry of entries) {
    const key = `${entry.effectiveYear}-${String(entry.effectiveMonth).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }

  return Array.from(map.entries())
    .map(([key, ents]) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, month: m, entries: ents };
    })
    .sort((a, b) => b.year - a.year || b.month - a.month);
}

export const HistoricoService = {
  getGroups: async (): Promise<VersionHistoryGroup[]> => {
    const { fixedRevenues, recurringExpenses } = await fetchAll();
    const entries = toEntries(fixedRevenues, recurringExpenses);
    return groupByMonth(entries);
  },
};
