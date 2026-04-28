"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import type { MonthStatus } from "@/features/dashboard/types";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

interface MonthNavigatorProps {
  year: number;
  month: number;
  status: MonthStatus;
  onChange: (year: number, month: number) => void;
  onGoToCurrent?: () => void;
  className?: string;
}

const STATUS_BADGE: Record<MonthStatus, { label: string; cls: string }> = {
  current: { label: "Mês vigente", cls: "bg-green-light text-green" },
  future: { label: "Projeção", cls: "bg-[#fff3e0] text-[#e65100]" },
  past: { label: "Passado", cls: "bg-bg text-text-subtle border border-border" },
};

export function MonthNavigator({
  year,
  month,
  status,
  onChange,
  onGoToCurrent,
  className,
}: MonthNavigatorProps) {
  const label = `${MONTH_NAMES[month - 1]} de ${year}`;
  const badge = STATUS_BADGE[status];

  const prev = () => {
    const d = new Date(year, month - 2, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  };
  const next = () => {
    const d = new Date(year, month, 1);
    onChange(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <div className={cn("flex items-center justify-between flex-wrap gap-3", className)}>
      <div className="flex items-center gap-3.5">
        <button
          onClick={prev}
          className="rounded-lg border border-border bg-surface p-1.5 text-text-muted hover:bg-bg hover:text-text"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <div className="text-[22px] font-bold capitalize">{label}</div>
          <div className="mt-0.5 flex gap-1.5">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                badge.cls,
              )}
            >
              {badge.label}
            </span>
          </div>
        </div>
        <button
          onClick={next}
          className="rounded-lg border border-border bg-surface p-1.5 text-text-muted hover:bg-bg hover:text-text"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {status !== "current" && onGoToCurrent && (
        <button
          onClick={onGoToCurrent}
          className="rounded-lg px-2.5 py-1.5 text-sm text-text-muted hover:bg-bg hover:text-text"
        >
          ← Mês atual
        </button>
      )}
    </div>
  );
}
