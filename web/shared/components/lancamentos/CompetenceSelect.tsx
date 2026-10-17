"use client";

import { useId } from "react";
import { cn } from "../../lib/utils";
import {
  compareCompetences,
  formatCompetenceLong,
  monthRange,
  type Competence,
} from "../../lib/competence";

interface CompetenceSelectProps {
  label: string;
  value: Competence;
  onChange: (value: Competence) => void;
  /** Primeira opção oferecida (mês corrente, ou o início da série no seletor de término). */
  from: Competence;
  count?: number;
  required?: boolean;
  error?: string;
}

const key = (c: Competence) => `${c.year}-${c.month}`;

/**
 * Seletor de um único mês com 36 opções a partir de `from`. Se o valor atual
 * estiver fora da lista (edição de algo já cadastrado), ele entra no topo para
 * o `<select>` não mostrar uma opção diferente da que está no estado.
 */
export function CompetenceSelect({
  label,
  value,
  onChange,
  from,
  count = 36,
  required = true,
  error,
}: CompetenceSelectProps) {
  const id = useId();
  const options = monthRange(from, count);
  if (!options.some((option) => compareCompetences(option, value) === 0)) options.unshift(value);

  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <label
        htmlFor={id}
        className="text-[12.5px] font-semibold uppercase tracking-[0.04em] text-text-muted"
      >
        {label}
        {required && <span className="text-red"> *</span>}
      </label>
      <select
        id={id}
        value={key(value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => {
          const [year, month] = event.target.value.split("-").map(Number);
          onChange({ year, month });
        }}
        className={cn(
          "h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red",
          error && "border-red",
        )}
      >
        {options.map((option) => (
          <option key={key(option)} value={key(option)}>
            {formatCompetenceLong(option)}
          </option>
        ))}
      </select>
      {error && (
        <p id={`${id}-error`} className="text-sm text-red">
          {error}
        </p>
      )}
    </div>
  );
}
