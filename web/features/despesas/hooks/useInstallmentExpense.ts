"use client";

import { useQuery } from "@tanstack/react-query";
import { DespesasService } from "../services/DespesasService";
import { getApiErrorMessage } from "@/infra/api-error";
import { QK } from "./useExpenseMonth";
import { formatCompetenceShort } from "@/shared/lib/competence";
import type { InstallmentExpense } from "../types";

const sum = (amounts: number[]) => Math.round(amounts.reduce((a, b) => a + b, 0) * 100) / 100;
const parcelas = (n: number) => `${n} ${n === 1 ? "parcela" : "parcelas"}`;

/** Fatos da Ficha de parcelada, a partir da situação de cada parcela informada pelo servidor. */
export function toInstallmentSummary(expense: InstallmentExpense) {
  const paid = expense.installments.filter((i) => i.status === "PAID");
  const remaining = expense.installments.filter((i) => i.status !== "PAID");
  const current = expense.installments.find((i) => i.status === "CURRENT");
  const start = { year: expense.startYear, month: expense.startMonth };
  const end = { year: expense.endYear, month: expense.endMonth };
  const last = expense.installments[expense.installments.length - 1];
  return {
    paid: { amount: sum(paid.map((i) => i.amount)), label: parcelas(paid.length) },
    remaining: { amount: sum(remaining.map((i) => i.amount)), label: parcelas(remaining.length) },
    current: current ? `${current.installmentNumber}/${expense.installmentCount}` : "—",
    end: formatCompetenceShort(end),
    range: `${formatCompetenceShort(start)} → ${formatCompetenceShort(end)}`,
    progress: expense.installments.length ? paid.length / expense.installments.length : 0,
    lastAmount: last?.amount ?? 0,
  };
}

export function useInstallmentExpense(id: string) {
  const query = useQuery({
    queryKey: [...QK, "installment", id],
    queryFn: () => DespesasService.getInstallment(id),
    staleTime: 30_000,
  });

  return {
    ...query,
    summary: query.data ? toInstallmentSummary(query.data) : undefined,
    errorMessage: query.error
      ? getApiErrorMessage(query.error, "Erro ao carregar parcelamento.")
      : null,
  };
}
