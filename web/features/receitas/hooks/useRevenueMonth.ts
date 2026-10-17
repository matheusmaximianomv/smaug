"use client";

import { useQuery } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { getApiErrorMessage } from "@/infra/api-error";
import { fromApiStatus, type Competence } from "@/shared/lib/competence";
import { groupRows, seriesPeriod, totalLabel, type LedgerRow } from "@/shared/lib/ledger";
import type { SummarySegment } from "@/shared/components/lancamentos/MonthSummary";
import type { RevenueMonth, RevenueMonthItem } from "../types";

/** Prefixo de todas as queries de receitas: as mutations invalidam por ele. */
export const QK = ["revenues"];

const GROUP_ORDER = [
  { kind: "fixa" as const, title: "Fixas" },
  { kind: "avulsa" as const, title: "Avulsas" },
];

export const MODALITY_LABEL = { ALTERABLE: "Alterável", UNALTERABLE: "Inalterável" } as const;

export function toRevenueRow(item: RevenueMonthItem): LedgerRow<RevenueMonthItem> {
  if (item.type === "FIXED") {
    const end =
      item.endYear !== null && item.endMonth !== null
        ? { year: item.endYear, month: item.endMonth }
        : null;
    return {
      key: `FIXED-${item.id}`,
      kind: "fixa",
      title: item.currentVersion.description,
      subtitle: [
        MODALITY_LABEL[item.modality],
        ...seriesPeriod({ year: item.startYear, month: item.startMonth }, end),
      ],
      amount: item.currentVersion.amount,
      amountCaption: "por mês",
      previousAmount: item.previousAmount,
      item,
    };
  }
  return {
    key: `ONE_TIME-${item.id}`,
    kind: "avulsa",
    title: item.description,
    subtitle: [],
    amount: item.amount,
    previousAmount: null,
    item,
  };
}

/** View-model do mês: grupos Fixas · Avulsas, resumo e situação. */
export function toRevenueLedger(month: RevenueMonth) {
  const status = fromApiStatus(month.competenceStatus);
  const items: RevenueMonthItem[] = [
    ...month.fixedRevenues.map((r) => ({ ...r, type: "FIXED" as const })),
    ...month.oneTimeRevenues.map((r) => ({ ...r, type: "ONE_TIME" as const })),
  ];
  const segments: SummarySegment[] = [
    { kind: "fixa", label: "Fixas", amount: month.totals.fixedTotal },
    { kind: "avulsa", label: "Avulsas", amount: month.totals.oneTimeTotal },
  ];
  return {
    status,
    reference: month.reference,
    groups: groupRows(items.map(toRevenueRow), GROUP_ORDER),
    count: items.length,
    total: month.totals.total,
    totalLabel: totalLabel(status, "revenue"),
    segments,
  };
}

export function useRevenueMonth(competence: Competence) {
  const query = useQuery({
    queryKey: [...QK, "month", competence.year, competence.month],
    queryFn: () => ReceitasService.getMonth(competence),
    staleTime: 30_000,
  });

  return {
    ...query,
    ledger: query.data ? toRevenueLedger(query.data) : undefined,
    errorMessage: query.error
      ? getApiErrorMessage(query.error, "Erro ao carregar receitas.")
      : null,
  };
}
