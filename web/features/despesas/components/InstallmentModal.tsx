import { Modal } from "@/shared/components/Modal";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import { cn } from "@/shared/lib/utils";
import type { InstallmentExpense } from "../types";

interface InstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: InstallmentExpense | null;
  currentYear: number;
  currentMonth: number;
}

export function InstallmentModal({
  isOpen,
  onClose,
  expense,
  currentYear,
  currentMonth,
}: InstallmentModalProps) {
  if (!expense) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Parcelas — ${expense.description}`} width="md">
      <div className="flex flex-col">
        {expense.installments.map((inst) => {
          const isPast =
            inst.competenceYear < currentYear ||
            (inst.competenceYear === currentYear && inst.competenceMonth < currentMonth);
          const isCur =
            inst.competenceYear === currentYear && inst.competenceMonth === currentMonth;
          return (
            <div
              key={inst.id}
              className={cn(
                "flex items-center gap-3 py-2.5 border-b border-border last:border-0 flex-wrap",
                isPast && "opacity-50",
              )}
            >
              <span className="text-xs font-bold text-text-subtle min-w-[60px]">
                {formatMonthYear(inst.competenceYear, inst.competenceMonth)}
              </span>
              <span className="text-sm">
                {inst.installmentNumber}/{expense.installmentCount}
              </span>
              {isPast && (
                <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-subtle">
                  Pago
                </span>
              )}
              {isCur && (
                <span className="inline-flex rounded-full bg-green-light px-2 py-0.5 text-[10px] font-semibold text-green">
                  Atual
                </span>
              )}
              <span className="ml-auto text-[14px] font-semibold text-red">
                {formatCurrency(inst.amount)}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
