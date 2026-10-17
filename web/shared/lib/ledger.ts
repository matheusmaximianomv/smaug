import {
  compareCompetences,
  formatCompetenceShort,
  type Competence,
  type CompetenceStatus,
} from "./competence";
import type { EntryKind, Tone } from "./entry-types";
import type { MonthStripCell } from "../components/lancamentos/MonthStrip";

/**
 * Peças comuns ao "Extrato do mês" de Receitas e de Despesas: o view-model da
 * linha/grupo e as regras de texto que as duas telas compartilham.
 */

export interface LedgerRow<T> {
  key: string;
  kind: EntryKind;
  title: string;
  subtitle: string[];
  amount: number;
  amountCaption?: string;
  previousAmount: number | null;
  progress?: { current: number; total: number };
  item: T;
}

export interface LedgerGroup<T> {
  kind: EntryKind;
  title: string;
  rows: LedgerRow<T>[];
  subtotal: number;
}

const SHORT_MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/** "Total gasto"/"Total recebido" em mês passado; "Total previsto" no corrente e futuros. */
export function totalLabel(status: CompetenceStatus, tone: Tone): string {
  if (status !== "past") return "Total previsto";
  return tone === "expense" ? "Total gasto" : "Total recebido";
}

/** ["desde Jan/26", "até Dez/26" | "sem término"]. */
export function seriesPeriod(start: Competence, end: Competence | null): string[] {
  return [
    `desde ${formatCompetenceShort(start)}`,
    end ? `até ${formatCompetenceShort(end)}` : "sem término",
  ];
}

/** "Jan/26 → Dez/26" ou "Jan/26 → em aberto" (subtítulo da Ficha de série). */
export function seriesRange(start: Competence, end: Competence | null): string {
  return `${formatCompetenceShort(start)} → ${end ? formatCompetenceShort(end) : "em aberto"}`;
}

/** Agrupa na ordem dada, omitindo grupos vazios. */
export function groupRows<T>(
  rows: LedgerRow<T>[],
  order: { kind: EntryKind; title: string }[],
): LedgerGroup<T>[] {
  return order
    .map(({ kind, title }) => {
      const groupRows = rows.filter((row) => row.kind === kind);
      const subtotal = Math.round(groupRows.reduce((sum, row) => sum + row.amount, 0) * 100) / 100;
      return { kind, title, rows: groupRows, subtotal };
    })
    .filter((group) => group.rows.length > 0);
}

/** Células da faixa de 12 meses do ano `year`. */
export function buildStripCells(
  year: number,
  totals: (number | null)[],
  selected: Competence,
  current: Competence,
): MonthStripCell[] {
  return SHORT_MONTHS.map((label, i) => {
    const competence = { year, month: i + 1 };
    return {
      month: i + 1,
      label,
      total: totals[i] ?? null,
      selected: compareCompetences(competence, selected) === 0,
      isCurrent: compareCompetences(competence, current) === 0,
    };
  });
}
