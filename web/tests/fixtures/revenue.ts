import type { FixedRevenue, FixedRevenueVersion, OneTimeRevenue } from "@/features/receitas/types";
import { FIXED_DATE, fixtureUuid, nextId } from "./ids";

export function makeOneTimeRevenue(o: Partial<OneTimeRevenue> = {}): OneTimeRevenue {
  return {
    id: nextId("rev"),
    userId: fixtureUuid(1),
    description: "Freelance",
    amount: 1500,
    competenceYear: 2026,
    competenceMonth: 9,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
  };
}

export function makeFixedRevenueVersion(o: Partial<FixedRevenueVersion> = {}): FixedRevenueVersion {
  return {
    id: nextId("frv"),
    description: "Salário",
    amount: 8000,
    effectiveYear: 2026,
    effectiveMonth: 9,
    createdAt: FIXED_DATE,
    ...o,
  };
}

/**
 * `versions` fica **undefined** por padrão de propósito: o ramo `versions ?? []`
 * do HistoricoService só é exercitado por uma fixture sem versões.
 */
export function makeFixedRevenue(o: Partial<FixedRevenue> = {}): FixedRevenue {
  const currentVersion = o.currentVersion ?? makeFixedRevenueVersion();
  return {
    id: nextId("fix"),
    userId: fixtureUuid(1),
    modality: "ALTERABLE",
    startYear: currentVersion.effectiveYear,
    startMonth: currentVersion.effectiveMonth,
    endYear: null,
    endMonth: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    currentVersion,
  };
}
