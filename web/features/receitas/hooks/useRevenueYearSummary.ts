"use client";

import { useQuery } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { QK } from "./useRevenueMonth";

/** Totais dos 12 meses do ano, para a faixa; nulo onde não há lançamento. */
export function useRevenueYearSummary(year: number) {
  const query = useQuery({
    queryKey: [...QK, "summary", year],
    queryFn: () => ReceitasService.getYearSummary(year),
    staleTime: 30_000,
  });

  const totals = query.data?.months.map((m) => (m.totals.total > 0 ? m.totals.total : null)) ?? [];
  return { ...query, totals };
}
