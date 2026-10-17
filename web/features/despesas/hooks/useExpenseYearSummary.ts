"use client";

import { useQuery } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { QK } from "./useExpenseMonth";

/** Totais dos 12 meses do ano, para a faixa; nulo onde não há lançamento. */
export function useExpenseYearSummary(year: number) {
  const query = useQuery({
    queryKey: [...QK, "summary", year],
    queryFn: () => DespesasService.getYearSummary(year),
    staleTime: 30_000,
  });

  const totals = query.data?.months.map((m) => (m.totals.total > 0 ? m.totals.total : null)) ?? [];
  return { ...query, totals };
}
