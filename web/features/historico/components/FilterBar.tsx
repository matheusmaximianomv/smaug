"use client";

import type { HistoricoFilter } from "../types";

interface FilterBarProps {
  value: HistoricoFilter;
  onChange: (v: HistoricoFilter) => void;
}

const OPTIONS: { label: string; value: HistoricoFilter }[] = [
  { label: "Todos", value: "all" },
  { label: "Receitas Fixas", value: "fixed-revenues" },
  { label: "Despesas Recorrentes", value: "recurring-expenses" },
];

export function FilterBar({ value, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-red text-white"
              : "bg-surface border border-border text-text hover:border-red/40"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
