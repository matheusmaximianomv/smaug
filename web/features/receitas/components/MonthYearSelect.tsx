"use client";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const YEARS = [2025, 2026, 2027, 2028];

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
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          {MONTHS.map((n, i) => (
            <option key={i} value={i + 1}>
              {n}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red"
        >
          {YEARS.map((y) => (
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
