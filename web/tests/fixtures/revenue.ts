import type { FixedRevenue, FixedRevenueVersion, OneTimeRevenue } from "@/features/receitas/types";
import { compareCompetences, type Competence } from "@/shared/lib/competence";
import { FIXED_DATE, fixtureUuid, nextId } from "./ids";
import { NOW_COMPETENCE } from "../time";

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
    isExpired: false,
    reference: { ...NOW_COMPETENCE },
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    currentVersion,
  };
}

const effectiveOf = (v: FixedRevenueVersion) => ({
  year: v.effectiveYear,
  month: v.effectiveMonth,
});

/** Versão em vigor em `c` (a última com vigência ≤ c), como o servidor resolve. */
export function fixedVersionAt(
  versions: FixedRevenueVersion[],
  c: Competence,
): FixedRevenueVersion | undefined {
  return [...versions]
    .sort((a, b) => compareCompetences(effectiveOf(a), effectiveOf(b)))
    .filter((v) => compareCompetences(effectiveOf(v), c) <= 0)
    .at(-1);
}

/** Recalcula `isExpired`, `reference` e a versão vigente de uma receita fixa. */
export function projectFixedRevenue(
  r: FixedRevenue,
  reference: Competence = NOW_COMPETENCE,
): FixedRevenue {
  const versions = [...(r.versions ?? [r.currentVersion])].sort((a, b) =>
    compareCompetences(effectiveOf(a), effectiveOf(b)),
  );
  const end =
    r.endYear !== null && r.endMonth !== null ? { year: r.endYear, month: r.endMonth } : null;
  return {
    ...r,
    versions,
    currentVersion: fixedVersionAt(versions, reference) ?? versions[0],
    isExpired: !!end && compareCompetences(end, reference) < 0,
    reference: { ...reference },
  };
}
