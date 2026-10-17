import type { ApiCompetenceStatus, Competence } from "@/shared/lib/competence";

export interface OneTimeRevenue {
  id: string;
  userId: string;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}

export type RevenueModality = "ALTERABLE" | "UNALTERABLE";

export interface FixedRevenueVersion {
  id: string;
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}

export interface FixedRevenue {
  id: string;
  userId: string;
  modality: RevenueModality;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  /** Término anterior ao mês corrente do servidor. */
  isExpired: boolean;
  reference: Competence;
  currentVersion: FixedRevenueVersion;
  versions?: FixedRevenueVersion[];
  createdAt: string;
  updatedAt: string;
}

// ---- consulta mensal (GET /revenues) ----

/** Fixa como a consulta mensal devolve: `currentVersion` é a versão do mês consultado. */
export interface FixedRevenueMonthItem extends FixedRevenue {
  /** Valor da versão anterior no mês em que a vigente começa; `null` fora dele. */
  previousAmount: number | null;
}

export interface RevenueTotals {
  oneTimeTotal: number;
  fixedTotal: number;
  total: number;
}

export interface RevenueMonth {
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: ApiCompetenceStatus;
  /** Mês corrente do servidor (UTC). */
  reference: Competence;
  oneTimeRevenues: OneTimeRevenue[];
  fixedRevenues: FixedRevenueMonthItem[];
  totals: RevenueTotals;
}

/** Item da lista do mês, discriminado pelo tipo (a API devolve as duas listas separadas). */
export type RevenueMonthItem =
  | ({ type: "ONE_TIME" } & OneTimeRevenue)
  | ({ type: "FIXED" } & FixedRevenueMonthItem);

export interface RevenueYearSummary {
  year: number;
  reference: Competence;
  months: { month: number; competenceStatus: ApiCompetenceStatus; totals: RevenueTotals }[];
}
