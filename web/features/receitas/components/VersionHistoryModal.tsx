import { Modal } from "@/shared/components/Modal";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import type { FixedRevenue } from "../types";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  revenue: FixedRevenue | null;
}

export function VersionHistoryModal({ isOpen, onClose, revenue }: VersionHistoryModalProps) {
  if (!revenue) return null;

  const sorted = [...revenue.versions].sort((a, b) => {
    if (b.effectiveYear !== a.effectiveYear) return b.effectiveYear - a.effectiveYear;
    return b.effectiveMonth - a.effectiveMonth;
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de versões" width="md">
      <div className="flex flex-col">
        {sorted.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-3 py-2.5 border-b border-border last:border-0 flex-wrap"
          >
            <span className="text-xs font-bold text-text-subtle min-w-[70px]">
              A partir de {formatMonthYear(v.effectiveYear, v.effectiveMonth)}
            </span>
            <div className="flex-1">
              <div className="text-[13.5px] text-text">{v.description}</div>
            </div>
            <span className="text-[14px] font-semibold text-green ml-auto">
              {formatCurrency(v.amount)}/mês
            </span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
