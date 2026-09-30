"use client";

import { MONTH_NAMES_FULL } from "@/shared/lib/dateUtils";
import { selectableYears } from "@/shared/lib/competence";

interface MonthYearSelectProps {
  label?: string;
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
  error?: string;
  required?: boolean;
}

export function MonthYearSelect({
  label,
  month,
  year,
  onMonthChange,
  onYearChange,
  error,
  required,
}: MonthYearSelectProps) {
  const years = selectableYears();

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-text">
          {label}
          {required && <span className="text-red"> *</span>}
        </label>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={month}
          onChange={(e) => onMonthChange(Number(e.target.value))}
          aria-label={`${label ?? "Competência"} — mês`}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          {MONTH_NAMES_FULL.map((n, i) => (
            <option key={i} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          aria-label={`${label ?? "Competência"} — ano`}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="mt-1.5 text-sm text-red">{error}</p>}
    </div>
  );
}
