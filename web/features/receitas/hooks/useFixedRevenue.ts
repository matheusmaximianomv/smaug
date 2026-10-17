"use client";

import { useQuery } from "@tanstack/react-query";
import { ReceitasService } from "../services/ReceitasService";
import { getApiErrorMessage } from "@/infra/api-error";
import { QK } from "./useRevenueMonth";
import type { SeriesModel } from "@/shared/hooks/useSeriesActions";
import type { FixedRevenue } from "../types";

/** Receita fixa no formato comum das Fichas de série; inalterável não aceita versões. */
export function toSeriesModel(revenue: FixedRevenue): SeriesModel {
  const versions = revenue.versions ?? [revenue.currentVersion];
  return {
    start: { year: revenue.startYear, month: revenue.startMonth },
    end:
      revenue.endYear !== null && revenue.endMonth !== null
        ? { year: revenue.endYear, month: revenue.endMonth }
        : null,
    isExpired: revenue.isExpired,
    reference: revenue.reference,
    versions: versions.map((v) => ({
      id: v.id,
      effective: { year: v.effectiveYear, month: v.effectiveMonth },
      amount: v.amount,
      description: v.description,
    })),
    currentVersionId: revenue.currentVersion.id,
    allowsVersions: revenue.modality === "ALTERABLE",
  };
}

export function useFixedRevenue(id: string) {
  const query = useQuery({
    queryKey: [...QK, "fixed", id],
    queryFn: () => ReceitasService.getFixed(id),
    staleTime: 30_000,
  });

  return {
    ...query,
    series: query.data ? toSeriesModel(query.data) : undefined,
    errorMessage: query.error
      ? getApiErrorMessage(query.error, "Erro ao carregar receita fixa.")
      : null,
  };
}
