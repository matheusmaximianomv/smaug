import { Trash2, List } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import { Button } from "@/shared/components/Button";
import type { InstallmentExpense } from "../types";

interface InstallmentCardProps {
  expense: InstallmentExpense;
  onViewInstallments: (exp: InstallmentExpense) => void;
  onDelete: (id: string) => void;
  currentYear: number;
  currentMonth: number;
}

export function InstallmentCard({
  expense,
  onViewInstallments,
  onDelete,
  currentYear,
  currentMonth,
}: InstallmentCardProps) {
  const paid = expense.installments.filter(
    (i) =>
      i.competenceYear < currentYear ||
      (i.competenceYear === currentYear && i.competenceMonth < currentMonth),
  ).length;

  const lastInst = expense.installments[expense.installments.length - 1];

  return (
    <div className="rounded-lg border border-border bg-surface p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[14.5px] font-semibold mb-1">{expense.description}</div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#fff7ed] text-[#c2660a]">
              Parcelada
            </span>
            {expense.category && (
              <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-[#f5f0ff] text-[#6841c7]">
                {expense.category.name}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[18px] font-bold text-red">
            {formatCurrency(expense.installments[0]?.amount ?? 0)}
            <span className="text-xs font-normal text-text-subtle">/parcela</span>
          </span>
          <span className="text-[11px] text-text-subtle">
            {formatCurrency(expense.totalAmount)} total
          </span>
        </div>
      </div>
      <div className="text-xs text-text-muted mb-2">
        {expense.installmentCount}× · {formatMonthYear(expense.startYear, expense.startMonth)} →{" "}
        {lastInst ? formatMonthYear(lastInst.competenceYear, lastInst.competenceMonth) : "—"}
        <span className="ml-3 text-text-subtle">
          {paid}/{expense.installmentCount} pagas
        </span>
      </div>
      <div className="h-[3px] bg-border rounded-sm overflow-hidden mb-2.5">
        <div
          className="h-full bg-red rounded-sm"
          style={{ width: `${(paid / expense.installmentCount) * 100}%` }}
        />
      </div>
      <div className="flex gap-1.5 border-t border-border pt-2.5">
        <Button variant="ghost" size="sm" onClick={() => onViewInstallments(expense)}>
          <List size={12} className="mr-1" /> Ver parcelas
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(expense.id)}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}
