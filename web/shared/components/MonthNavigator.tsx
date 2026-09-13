"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { addMonths } from "../lib/competence";
import { MONTH_NAMES_FULL } from "../lib/dateUtils";
import type { MonthStatus } from "@/features/dashboard/types";

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
  const label = `${MONTH_NAMES_FULL[month - 1]} de ${year}`;
  const badge = STATUS_BADGE[status];

  const shift = (offset: number) => {
    const target = addMonths({ year, month }, offset);
    onChange(target.year, target.month);
  };

  return (
    <div className={cn("flex items-center justify-between flex-wrap gap-3", className)}>
      <div className="flex items-center gap-3.5">
        <button
          onClick={() => shift(-1)}
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
          onClick={() => shift(1)}
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
