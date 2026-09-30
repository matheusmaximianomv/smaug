"use client";

import { useState } from "react";
import { compareCompetences, getCurrentCompetence, type Competence } from "@/shared/lib/competence";
import { getErrorMessageByCode } from "@/infra/api-error";
import type { ExportMode, ExportParams } from "../types";

/** Mesmo teto que `EXPORT_MAX_MONTHS` cobra no servidor; aqui ele evita um 400 por tecla digitada. */
const MAX_MONTHS = 12;
const MONTHS_IN_YEAR = 12;

export interface ExportSelection {
  mode: ExportMode;
  setMode: (mode: ExportMode) => void;
  start: Competence;
  setStart: (competence: Competence) => void;
  end: Competence;
  setEnd: (competence: Competence) => void;
  params: ExportParams;
  /** `undefined` quando o recorte é aceitável; do contrário, a cópia que a API usaria. */
  periodError: string | undefined;
}

function spanInMonths(start: Competence, end: Competence): number {
  return (end.year - start.year) * MONTHS_IN_YEAR + (end.month - start.month) + 1;
}

function resolvePeriodError(start: Competence, end: Competence): string | undefined {
  if (compareCompetences(end, start) < 0) {
    return getErrorMessageByCode("EXPORT_PERIOD_INVALID", "Período inválido.");
  }
  if (spanInMonths(start, end) > MAX_MONTHS) {
    return getErrorMessageByCode("EXPORT_PERIOD_TOO_LONG", "Período longo demais.");
  }
  return undefined;
}

/**
 * Recorte escolhido na tela de exportação. A regra do período mora aqui, e não no painel, porque o
 * painel só desenha: é este hook que decide se vale consultar a API e qual frase o usuário lê —
 * sempre a mesma que `api-error.ts` daria se a chamada tivesse ido e voltado com o código.
 */
export function useExportSelection(): ExportSelection {
  const current = getCurrentCompetence();
  const [mode, setMode] = useState<ExportMode>("period");
  const [start, setStart] = useState<Competence>(current);
  const [end, setEnd] = useState<Competence>(current);

  const periodError = mode === "full" ? undefined : resolvePeriodError(start, end);

  const params: ExportParams =
    mode === "full"
      ? { mode: "full" }
      : {
          mode: "period",
          startYear: start.year,
          startMonth: start.month,
          endYear: end.year,
          endMonth: end.month,
        };

  return { mode, setMode, start, setStart, end, setEnd, params, periodError };
}
