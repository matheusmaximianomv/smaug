"use client";

import { useQuery } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { getApiErrorMessage } from "@/infra/api-error";
import { formatCompetenceShort, fromApiStatus, type Competence } from "@/shared/lib/competence";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { groupRows, seriesPeriod, totalLabel, type LedgerRow } from "@/shared/lib/ledger";
import type { SummarySegment } from "@/shared/components/lancamentos/MonthSummary";
import type { ExpenseMonth, ExpenseMonthItem } from "../types";

/** Prefixo de todas as queries de despesas: as mutations invalidam por ele. */
export const QK = ["expenses"];

const GROUP_ORDER = [
  { kind: "recorrente" as const, title: "Recorrentes" },
  { kind: "parcelada" as const, title: "Parceladas" },
  { kind: "avulsa" as const, title: "Avulsas" },
];

export function toExpenseRow(item: ExpenseMonthItem): LedgerRow<ExpenseMonthItem> {
  const category = item.category.name;
  if (item.type === "INSTALLMENT") {
    return {
      key: `INSTALLMENT-${item.installmentExpenseId}`,
      kind: "parcelada",
      title: item.description,
      subtitle: [
        category,
        `Parcela ${item.installmentNumber} de ${item.installmentCount}`,
        `termina ${formatCompetenceShort({ year: item.endYear, month: item.endMonth })}`,
      ],
      amount: item.amount,
      amountCaption: `de ${formatCurrency(item.totalAmount)}`,
      previousAmount: null,
      progress: { current: item.installmentNumber, total: item.installmentCount },
      item,
    };
  }
  if (item.type === "RECURRING") {
    const end =
      item.endYear !== null && item.endMonth !== null
        ? { year: item.endYear, month: item.endMonth }
        : null;
    return {
      key: `RECURRING-${item.recurringExpenseId}`,
      kind: "recorrente",
      title: item.description,
      subtitle: [category, ...seriesPeriod({ year: item.startYear, month: item.startMonth }, end)],
      amount: item.amount,
      amountCaption: "por mês",
      previousAmount: item.previousAmount,
      item,
    };
  }
  return {
    key: `ONE_TIME-${item.id}`,
    kind: "avulsa",
    title: item.description,
    subtitle: [category],
    amount: item.amount,
    previousAmount: null,
    item,
  };
}

/** View-model do mês: grupos Recorrentes · Parceladas · Avulsas, resumo e situação. */
export function toExpenseLedger(month: ExpenseMonth) {
  const status = fromApiStatus(month.competenceStatus);
  const segments: SummarySegment[] = [
    { kind: "recorrente", label: "Recorrentes", amount: month.totals.recurring },
    { kind: "parcelada", label: "Parceladas", amount: month.totals.installment },
    { kind: "avulsa", label: "Avulsas", amount: month.totals.oneTime },
  ];
  return {
    status,
    reference: month.reference,
    groups: groupRows(month.expenses.map(toExpenseRow), GROUP_ORDER),
    count: month.expenses.length,
    total: month.totals.total,
    totalLabel: totalLabel(status, "expense"),
    segments,
  };
}

export function useExpenseMonth(competence: Competence) {
  const query = useQuery({
    queryKey: [...QK, "month", competence.year, competence.month],
    queryFn: () => DespesasService.getMonth(competence),
    staleTime: 30_000,
  });

  return {
    ...query,
    ledger: query.data ? toExpenseLedger(query.data) : undefined,
    errorMessage: query.error
      ? getApiErrorMessage(query.error, "Erro ao carregar despesas.")
      : null,
  };
}
