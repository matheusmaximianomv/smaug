import { MONTH_NAMES_FULL, formatMonthYear } from "./dateUtils";

export interface Competence {
  year: number;
  month: number;
}

export type CompetenceStatus = "past" | "current" | "future";

/** Situação como a API devolve (`competenceStatus`, calculada no "agora" UTC do servidor). */
export type ApiCompetenceStatus = "PAST" | "CURRENT" | "FUTURE";

const FROM_API: Record<ApiCompetenceStatus, CompetenceStatus> = {
  PAST: "past",
  CURRENT: "current",
  FUTURE: "future",
};

export function fromApiStatus(status: ApiCompetenceStatus): CompetenceStatus {
  return FROM_API[status];
}

export function sameCompetence(a: Competence | undefined, b: Competence | undefined): boolean {
  return !!a && !!b && compareCompetences(a, b) === 0;
}

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

/** Anos oferecidos nos seletores de competência, relativos ao ano corrente. */
export function selectableYears(reference: Competence = getCurrentCompetence()): number[] {
  const start = reference.year - 1;
  return Array.from({ length: 5 }, (_, i) => start + i);
}

/** Meses de `a` até `b` (negativo se `b` vem antes). `diffMonths(jan, mar) === 2`. */
export function diffMonths(a: Competence, b: Competence): number {
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** "Abr/26" — linhas, chips e grades. */
export function formatCompetenceShort({ year, month }: Competence): string {
  return formatMonthYear(year, month);
}

/** "Abril 2026" — título da tela e Revisão. */
export function formatCompetenceLong({ year, month }: Competence): string {
  return `${MONTH_NAMES_FULL[month - 1]} ${year}`;
}

/** `count` competências consecutivas a partir de `start`, inclusive. */
export function monthRange(start: Competence, count: number): Competence[] {
  return Array.from({ length: Math.max(0, count) }, (_, i) => addMonths(start, i));
}
