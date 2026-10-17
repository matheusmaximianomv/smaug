"use client";

import { useQuery } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { getApiErrorMessage } from "@/infra/api-error";
import { QK } from "./useExpenseMonth";
import type { SeriesModel } from "@/shared/hooks/useSeriesActions";
import type { RecurringExpense } from "../types";

/** Recorrente no formato comum das Fichas de série. */
export function toSeriesModel(expense: RecurringExpense): SeriesModel {
  const versions = expense.versions ?? [expense.currentVersion];
  return {
    start: { year: expense.startYear, month: expense.startMonth },
    end:
      expense.endYear !== null && expense.endMonth !== null
        ? { year: expense.endYear, month: expense.endMonth }
        : null,
    isExpired: expense.isExpired,
    reference: expense.reference,
    versions: versions.map((v) => ({
      id: v.id,
      effective: { year: v.effectiveYear, month: v.effectiveMonth },
      amount: v.amount,
      description: v.description,
      categoryId: v.categoryId,
      categoryName: v.category?.name,
    })),
    currentVersionId: expense.currentVersion.id,
    allowsVersions: true,
  };
}

export function useRecurringExpense(id: string) {
  const query = useQuery({
    queryKey: [...QK, "recurring", id],
    queryFn: () => DespesasService.getRecurring(id),
    staleTime: 30_000,
  });

  return {
    ...query,
    series: query.data ? toSeriesModel(query.data) : undefined,
    errorMessage: query.error
      ? getApiErrorMessage(query.error, "Erro ao carregar despesa recorrente.")
      : null,
  };
}
