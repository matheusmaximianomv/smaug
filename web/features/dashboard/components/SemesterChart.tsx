"use client";

import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { MonthChartData } from "../types";

interface SemesterChartProps {
  months: MonthChartData[];
  selectedYear: number;
  selectedMonth: number;
  onSelectMonth: (year: number, month: number) => void;
}

export function SemesterChart({
  months,
  selectedYear,
  selectedMonth,
  onSelectMonth,
}: SemesterChartProps) {
  const maxVal = Math.max(...months.flatMap((m) => [m.revenues, m.expenses]), 1);

  return (
    <div>
      <div className="flex items-end gap-2 h-[140px]">
        {months.map((m, i) => {
          const isSelected = m.year === selectedYear && m.month === selectedMonth;
          const revH = Math.max((m.revenues / maxVal) * 100, m.revenues > 0 ? 2 : 0);
          const expH = Math.max((m.expenses / maxVal) * 100, m.expenses > 0 ? 2 : 0);

          return (
            <div
              key={i}
              onClick={() => onSelectMonth(m.year, m.month)}
              title={`${m.label}: Receitas ${formatCurrency(m.revenues)} | Despesas ${formatCurrency(m.expenses)}`}
              className={cn(
                "flex flex-1 cursor-pointer flex-col items-center gap-1.5",
                !isSelected && "hover:opacity-85",
                isSelected && "opacity-100",
              )}
            >
              <div className="flex w-full items-end gap-0.5 h-[120px]">
                {/* Revenue bar */}
                <div className="flex flex-1 items-end h-full">
                  <div
                    className={cn(
                      "w-full rounded-t-sm",
                      m.isFuture
                        ? "opacity-60 bg-[repeating-linear-gradient(45deg,#1a7a4a,#1a7a4a_2px,transparent_2px,transparent_5px)] border border-green"
                        : "bg-green",
                    )}
                    style={{ height: `${revH}%` }}
                  />
                </div>
                {/* Expense bar */}
                <div className="flex flex-1 items-end h-full">
                  <div
                    className={cn(
                      "w-full rounded-t-sm",
                      m.isFuture
                        ? "opacity-60 bg-[repeating-linear-gradient(45deg,#c0292a,#c0292a_2px,transparent_2px,transparent_5px)] border border-red"
                        : "bg-red",
                    )}
                    style={{ height: `${expH}%` }}
                  />
                </div>
              </div>
              <span
                className={cn(
                  "text-[11px] font-medium whitespace-nowrap",
                  m.isFuture ? "text-text-subtle opacity-60" : "text-text-subtle",
                  isSelected && "font-bold text-red",
                )}
              >
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-3.5 text-xs text-text-muted">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green align-middle" />
          Receitas
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-red align-middle" />
          Despesas
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-sm border border-gray-400 bg-gray-300 opacity-60 align-middle" />
          Projeção
        </span>
      </div>
    </div>
  );
}
