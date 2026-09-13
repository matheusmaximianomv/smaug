export interface Competence {
  year: number;
  month: number;
}

export type CompetenceStatus = "past" | "current" | "future";

/** Negativo se a < b, zero se iguais, positivo se a > b. */
export function compareCompetences(a: Competence, b: Competence): number {
  return a.year !== b.year ? a.year - b.year : a.month - b.month;
}

export function addMonths({ year, month }: Competence, offset: number): Competence {
  const date = new Date(year, month - 1 + offset, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function getCurrentCompetence(): Competence {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getCompetenceStatus(
  competence: Competence,
  reference: Competence = getCurrentCompetence(),
): CompetenceStatus {
  const diff = compareCompetences(competence, reference);
  if (diff === 0) return "current";
  return diff < 0 ? "past" : "future";
}

/**
 * Competências passadas são bloqueadas para criação: a API rejeita com 409, então
 * o formulário precisa barrar antes de enviar.
 */
export function isEligible(
  competence: Competence,
  reference: Competence = getCurrentCompetence(),
): boolean {
  return compareCompetences(competence, reference) >= 0;
}

export function isBeforeOrEqual(a: Competence, b: Competence): boolean {
  return compareCompetences(a, b) <= 0;
}

/** Anos oferecidos nos seletores de competência, relativos ao ano corrente. */
export function selectableYears(reference: Competence = getCurrentCompetence()): number[] {
  const start = reference.year - 1;
  return Array.from({ length: 5 }, (_, i) => start + i);
}
