"use client";

import { useState } from "react";
import type { ZodType } from "zod";
import {
  addMonths,
  compareCompetences,
  formatCompetenceShort,
  type Competence,
} from "../lib/competence";
import { formatCurrency } from "../lib/formatCurrency";
import { ENTRY_KIND, versionTint } from "../lib/entry-types";
import { seriesSpan, seriesTimeline, type SeriesPreview } from "../lib/preview";
import { parseMoneyInput, toMoneyInput } from "../lib/money";
import type { MonthCell } from "../components/lancamentos/MonthCells";
import type { VersionChip } from "../components/lancamentos/VersionChips";
import type { VersionHistoryRow } from "../components/lancamentos/VersionHistoryList";

export interface SeriesVersion {
  id: string;
  effective: Competence;
  amount: number;
  description: string;
  categoryId?: string;
  categoryName?: string;
}

/** Recorrente ou receita fixa, normalizada pela feature a partir da resposta da API. */
export interface SeriesModel {
  start: Competence;
  end: Competence | null;
  isExpired: boolean;
  reference: Competence;
  versions: SeriesVersion[];
  currentVersionId: string;
  /** Recorrente sempre; fixa só quando alterável. */
  allowsVersions: boolean;
}

export type SeriesMode = "view" | "version" | "end" | "confirm";
export type SeriesTab = "timeline" | "history";

export interface VersionFormValues {
  description: string;
  amount: string;
  categoryId: string;
  from: Competence;
}

interface SeriesActionsOptions<V, E> {
  series: SeriesModel;
  kind: "recorrente" | "fixa";
  /** Schemas da feature: carregam as mensagens do PRD e a regra de competência passada. */
  versionSchema: ZodType<V>;
  endSchema: ZodType<E>;
}

type Errors = Record<string, string>;

/** Rótulo de valor na célula: "100,00" (sem "R$"). */
const cellAmount = (amount: number) => formatCurrency(amount).replace("R$", "").trim();
/** Folga da prévia depois do mês escolhido, para o efeito aparecer na linha. */
const PREVIEW_MARGIN = 3;

function issuesOf(error: { issues: { path: PropertyKey[]; message: string }[] }): Errors {
  const errors: Errors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0]);
    errors[field] ??= issue.message;
  }
  return errors;
}

/**
 * Estado da Ficha de série: modo (visualização, Nova versão, Encerrar,
 * confirmação), formulários preenchidos com a versão vigente e a linha do tempo
 * com a prévia ao vivo. Comum a recorrente (despesas) e fixa (receitas), que
 * diferem só nos schemas e na regra `allowsVersions`.
 */
export function useSeriesActions<V, E>({
  series,
  kind,
  versionSchema,
  endSchema,
}: SeriesActionsOptions<V, E>) {
  const current =
    series.versions.find((v) => v.id === series.currentVersionId) ?? series.versions[0];
  const [mode, setMode] = useState<SeriesMode>("view");
  const [tab, setTab] = useState<SeriesTab>("timeline");
  const [versionValues, setVersionValues] = useState<VersionFormValues>({
    description: "",
    amount: "",
    categoryId: "",
    from: addMonths(series.reference, 1),
  });
  const [last, setLast] = useState<Competence>(series.reference);
  const [errors, setErrors] = useState<Errors>({});

  const can = {
    version: series.allowsVersions && !series.isExpired,
    end: !series.isExpired,
  };

  const back = () => {
    setErrors({});
    setMode("view");
  };
  const openVersion = () => {
    setVersionValues({
      description: current.description,
      amount: toMoneyInput(current.amount),
      categoryId: current.categoryId ?? "",
      from: addMonths(series.reference, 1),
    });
    setErrors({});
    setMode("version");
  };
  const openEnd = () => {
    setLast(series.reference);
    setErrors({});
    setMode("end");
  };
  const openConfirm = () => setMode("confirm");

  const setVersionField = <K extends keyof VersionFormValues>(
    field: K,
    value: VersionFormValues[K],
  ) => setVersionValues((values) => ({ ...values, [field]: value }));

  const submitVersion = (onValid: (values: V) => void) => {
    const result = versionSchema.safeParse(versionValues);
    if (!result.success) return setErrors(issuesOf(result.error));
    setErrors({});
    onValid(result.data);
  };
  const submitEnd = (onValid: (values: E) => void) => {
    const result = endSchema.safeParse({ last });
    if (!result.success) return setErrors(issuesOf(result.error));
    setErrors({});
    onValid(result.data);
  };

  const typedAmount = parseMoneyInput(versionValues.amount);
  const preview: SeriesPreview | undefined =
    mode === "version"
      ? {
          mode: "version",
          from: versionValues.from,
          amount: Number.isFinite(typedAmount) ? typedAmount : 0,
        }
      : mode === "end"
        ? { mode: "end", last }
        : undefined;
  const extra =
    preview && addMonths(preview.mode === "version" ? preview.from : preview.last, PREVIEW_MARGIN);
  const span = seriesSpan({
    start: series.start,
    end: series.end,
    reference: series.reference,
    extra,
  });
  const total = series.versions.length;
  const cells: MonthCell[] = seriesTimeline(
    series.versions.map((v) => ({ effective: v.effective, amount: v.amount })),
    span,
    preview,
  ).map((cell) => ({
    key: `${cell.competence.year}-${cell.competence.month}`,
    month: formatCompetenceShort(cell.competence),
    state: cell.state,
    value: cell.showLabel && cell.amount !== null ? cellAmount(cell.amount) : "",
    color:
      cell.state === "new"
        ? ENTRY_KIND[kind].color
        : cell.versionIndex >= 0
          ? versionTint(kind, cell.versionIndex, total)
          : undefined,
    isReference: cell.isReference,
  }));

  const ascending = [...series.versions].sort((a, b) =>
    compareCompetences(a.effective, b.effective),
  );
  const chips: VersionChip[] = ascending.map((v, i) => ({
    key: v.id,
    since: `desde ${formatCompetenceShort(v.effective)}`,
    amount: formatCurrency(v.amount),
    color: versionTint(kind, i, total),
    isCurrent: v.id === current.id,
  }));
  const history: VersionHistoryRow[] = [...ascending].reverse().map((v) => ({
    key: v.id,
    from: `A partir de ${formatCompetenceShort(v.effective)}`,
    description: v.description,
    detail: v.categoryName,
    isCurrent: v.id === current.id,
    amount: `${formatCurrency(v.amount)}/mês`,
  }));

  return {
    mode,
    tab,
    setTab,
    can,
    /** Primeiro mês oferecido nos seletores de vigência e de encerramento. */
    minCompetence: series.reference,
    current,
    errors,
    openVersion,
    openEnd,
    openConfirm,
    back,
    version: { values: versionValues, set: setVersionField },
    end: { last, setLast },
    submitVersion,
    submitEnd,
    timeline: { cells, trailing: mode === "view" && span.open ? "continua…" : undefined },
    chips,
    history,
  };
}

export type SeriesActions = ReturnType<typeof useSeriesActions>;
