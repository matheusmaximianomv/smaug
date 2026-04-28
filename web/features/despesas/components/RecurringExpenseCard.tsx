import { Trash2, History, PlusCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import { Button } from "@/shared/components/Button";
import type { RecurringExpense } from "../types";

interface RecurringExpenseCardProps {
  expense: RecurringExpense;
  onAddVersion: (id: string) => void;
  onTerminate: (id: string) => void;
  onViewHistory: (exp: RecurringExpense) => void;
  onDelete: (id: string) => void;
  currentYear: number;
  currentMonth: number;
}

export function RecurringExpenseCard({
  expense,
  onAddVersion,
  onTerminate,
  onViewHistory,
  onDelete,
  currentYear,
  currentMonth,
}: RecurringExpenseCardProps) {
  const cv = expense.currentVersion;
  const isEnded =
    expense.endMonth != null &&
    (expense.endYear! < currentYear ||
      (expense.endYear === currentYear && expense.endMonth < currentMonth));

  return (
    <div
      className={`rounded-lg border border-border bg-surface p-4 hover:shadow-sm transition-shadow${isEnded ? " opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[14.5px] font-semibold mb-1">{cv?.description ?? "—"}</div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#f5f0ff] text-[#6841c7]">
              Recorrente
            </span>
            {cv?.category && (
              <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#f5f0ff] text-[#6841c7]">
                {cv.category.name}
              </span>
            )}
            {isEnded && (
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-text-subtle">
                Encerrada
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[18px] font-bold text-red">
            {formatCurrency(cv?.amount ?? 0)}
            <span className="text-xs font-normal text-text-subtle">/mês</span>
          </span>
        </div>
      </div>
      <div className="text-xs text-text-muted mb-3">
        Vigência: {formatMonthYear(expense.startYear, expense.startMonth)} →{" "}
        {expense.endMonth ? formatMonthYear(expense.endYear!, expense.endMonth) : "em aberto"}
        <span className="ml-3 text-text-subtle">
          {expense.versions.length} versão{expense.versions.length !== 1 ? "ões" : ""}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap border-t border-border pt-2.5">
        {!isEnded && (
          <Button variant="ghost" size="sm" onClick={() => onAddVersion(expense.id)}>
            <PlusCircle size={12} className="mr-1" /> Nova versão
          </Button>
        )}
        {!isEnded && (
          <Button variant="ghost" size="sm" onClick={() => onTerminate(expense.id)}>
            <XCircle size={12} className="mr-1" /> Encerrar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onViewHistory(expense)}>
          <History size={12} className="mr-1" /> Ver histórico
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(expense.id)}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}
