import {
  addMonths,
  compareCompetences,
  diffMonths,
  monthRange,
  type Competence,
} from "./competence";
import type { EntryKind } from "./entry-types";

/**
 * Prévias da Revisão, de Nova versão e de Encerrar. São só ilustração — quem
 * grava é o servidor —, mas precisam seguir as mesmas regras do domínio, senão a
 * tela promete um valor e o servidor grava outro.
 */

const CENTS = 100;
/** Meses mostrados quando a série não tem término (Revisão). */
const OPEN_SERIES_PREVIEW = 12;
/** Folga depois do mês corrente na linha do tempo de série sem término. */
const OPEN_SERIES_HORIZON = 8;
/** Teto de células da linha do tempo da Ficha. */
const MAX_TIMELINE = 36;

/**
 * Espelho exato de `InstallmentExpense.calculateInstallments` no servidor: divide
 * em centavos, cada parcela recebe o piso e o resto vai para a 1ª. Os testes
 * usam os mesmos casos do teste de domínio do servidor.
 */
export function splitInstallments(total: number, count: number): number[] {
  const totalCents = Math.round(total * CENTS);
  const base = Math.floor(totalCents / count);
  const remainder = totalCents % count;
  return Array.from({ length: count }, (_, i) => (base + (i === 0 ? remainder : 0)) / CENTS);
}

export interface AffectedMonth {
  competence: Competence;
  amount: number;
}

interface AffectedMonthsInput {
  kind: EntryKind;
  start: Competence;
  amount: number;
  /** Parcelada: número de parcelas. */
  count?: number;
  /** Série: mês final, ou `null` sem término. */
  end?: Competence | null;
}

/** Meses que um cadastro vai ocupar; `open` quando a série não tem término. */
export function affectedMonths({
  kind,
  start,
  amount,
  count = 1,
  end = null,
}: AffectedMonthsInput): {
  months: AffectedMonth[];
  open: boolean;
} {
  if (kind === "avulsa") return { months: [{ competence: start, amount }], open: false };

  if (kind === "parcelada") {
    const months = splitInstallments(amount, count).map((value, i) => ({
      competence: addMonths(start, i),
      amount: value,
    }));
    return { months, open: false };
  }

  const length = end ? Math.max(1, diffMonths(start, end) + 1) : OPEN_SERIES_PREVIEW;
  const months = monthRange(start, length).map((competence) => ({ competence, amount }));
  return { months, open: !end };
}

export interface SeriesSpan {
  months: Competence[];
  /** Há meses além da última célula ("continua…"). */
  open: boolean;
  reference: Competence;
}

interface SeriesSpanInput {
  start: Competence;
  end: Competence | null;
  reference: Competence;
  /** Garante que a prévia alcance este mês (vigência da nova versão + folga). */
  extra?: Competence;
}

/**
 * Meses da linha do tempo da Ficha: do início ao término; sem término, até o mês
 * corrente + 8. Limitada a 36 células.
 */
export function seriesSpan({ start, end, reference, extra }: SeriesSpanInput): SeriesSpan {
  let horizon = end ?? addMonths(reference, OPEN_SERIES_HORIZON);
  if (extra && compareCompetences(extra, horizon) > 0) horizon = extra;
  const length = Math.max(1, diffMonths(start, horizon) + 1);
  const truncated = length > MAX_TIMELINE;
  return {
    months: monthRange(start, Math.min(length, MAX_TIMELINE)),
    open: !end || truncated,
    reference,
  };
}

export interface TimelineVersion {
  effective: Competence;
  amount: number;
}

export type SeriesPreview =
  | { mode: "version"; from: Competence; amount: number }
  | { mode: "end"; last: Competence };

export type TimelineState = "normal" | "new" | "cut";

export interface TimelineCell {
  competence: Competence;
  amount: number | null;
  /** Índice da versão em ordem cronológica (0 = mais antiga); -1 sem versão. */
  versionIndex: number;
  state: TimelineState;
  /** O valor só é escrito no mês em que muda. */
  showLabel: boolean;
  isReference: boolean;
}

/**
 * Células da linha do tempo de uma série: versão vigente em cada mês e, com
 * `preview`, o efeito de uma nova versão (`new`, a partir de `from`) ou de um
 * encerramento (`cut`, depois de `last`).
 */
export function seriesTimeline(
  versions: TimelineVersion[],
  span: SeriesSpan,
  preview?: SeriesPreview,
): TimelineCell[] {
  const ascending = [...versions].sort((a, b) => compareCompetences(a.effective, b.effective));
  let previous: number | null = null;

  return span.months.map((competence) => {
    let versionIndex = -1;
    ascending.forEach((version, i) => {
      if (compareCompetences(version.effective, competence) <= 0) versionIndex = i;
    });
    let amount = versionIndex >= 0 ? ascending[versionIndex].amount : null;
    let state: TimelineState = "normal";

    if (preview?.mode === "version" && compareCompetences(competence, preview.from) >= 0) {
      amount = preview.amount;
      state = "new";
    }
    if (preview?.mode === "end" && compareCompetences(competence, preview.last) > 0) {
      amount = null;
      state = "cut";
    }

    const showLabel = amount !== null && amount !== previous;
    previous = amount;
    return {
      competence,
      amount,
      versionIndex,
      state,
      showLabel,
      isReference: compareCompetences(competence, span.reference) === 0,
    };
  });
}
