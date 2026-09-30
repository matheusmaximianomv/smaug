"use client";

import { getImportRowMessage } from "@/infra/api-error";
import type { ImportRowError } from "../types";

/** O protótipo lista no máximo 12 linhas; o resto vira contagem para a caixa não crescer sem fim. */
const MAX_LISTED = 12;

interface ImportErrorListProps {
  errors: ImportRowError[];
}

export function ImportErrorList({ errors }: ImportErrorListProps) {
  if (errors.length === 0) return null;

  const listed = errors.slice(0, MAX_LISTED);
  const remaining = errors.length - listed.length;

  return (
    <div className="rounded-lg border border-red-mid bg-red-light p-3.5">
      <div className="text-[13px] font-semibold text-red">
        {errors.length} {errors.length === 1 ? "linha com problema" : "linhas com problema"} —{" "}
        {errors.length === 1 ? "ela será ignorada" : "elas serão ignoradas"}
      </div>
      <ul className="mt-2 max-h-[260px] space-y-1 overflow-y-auto">
        {listed.map((error) => (
          <li key={`${error.line}-${error.code}`} className="flex gap-2 text-[12.5px]">
            <span className="min-w-[62px] shrink-0 tabular-nums text-text-muted">
              linha {error.line}
            </span>
            <span>{getImportRowMessage(error.code, error.value)}</span>
          </li>
        ))}
        {remaining > 0 && <li className="text-[12.5px] text-text-muted">+ {remaining} outras</li>}
      </ul>
    </div>
  );
}
