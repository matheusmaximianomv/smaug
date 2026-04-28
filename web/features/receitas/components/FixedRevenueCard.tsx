import { Trash2, History, PlusCircle, XCircle } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import { formatMonthYear } from "@/shared/lib/dateUtils";
import { Button } from "@/shared/components/Button";
import type { FixedRevenue } from "../types";

interface FixedRevenueCardProps {
  revenue: FixedRevenue;
  onAddVersion: (id: string) => void;
  onTerminate: (id: string) => void;
  onViewHistory: (revenue: FixedRevenue) => void;
  onDelete: (id: string) => void;
  currentYear: number;
  currentMonth: number;
}

const MODALITY_LABELS = { ALTERABLE: "Alterável", UNALTERABLE: "Inalterável" };
const MODALITY_COLORS = {
  ALTERABLE: "bg-bg border border-border text-text-muted",
  UNALTERABLE: "bg-bg border border-border text-text-subtle",
};

export function FixedRevenueCard({
  revenue,
  onAddVersion,
  onTerminate,
  onViewHistory,
  onDelete,
  currentYear,
  currentMonth,
}: FixedRevenueCardProps) {
  const cv = revenue.currentVersion;
  const isEnded =
    revenue.endMonth != null &&
    (revenue.endYear! < currentYear ||
      (revenue.endYear === currentYear && revenue.endMonth < currentMonth));

  return (
    <div
      className={`rounded-lg border border-border bg-surface p-4 hover:shadow-sm transition-shadow${isEnded ? " opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <div className="text-[14.5px] font-semibold mb-1">{cv?.description ?? "—"}</div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold bg-green-light text-green">
              Fixa
            </span>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${MODALITY_COLORS[revenue.modality]}`}
            >
              {MODALITY_LABELS[revenue.modality]}
            </span>
            {isEnded && (
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-text-subtle">
                Encerrada
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[18px] font-bold text-green">
            {formatCurrency(cv?.amount ?? 0)}
            <span className="text-xs font-normal text-text-subtle">/mês</span>
          </span>
        </div>
      </div>
      <div className="text-xs text-text-muted mb-3">
        Vigência: {formatMonthYear(revenue.startYear, revenue.startMonth)} →{" "}
        {revenue.endMonth ? formatMonthYear(revenue.endYear!, revenue.endMonth) : "em aberto"}
        <span className="ml-3 text-text-subtle">
          {revenue.versions.length} versão{revenue.versions.length !== 1 ? "ões" : ""}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap border-t border-border pt-2.5">
        {revenue.modality === "ALTERABLE" && !isEnded && (
          <Button variant="ghost" size="sm" onClick={() => onAddVersion(revenue.id)}>
            <PlusCircle size={12} className="mr-1" /> Nova versão
          </Button>
        )}
        {!isEnded && (
          <Button variant="ghost" size="sm" onClick={() => onTerminate(revenue.id)}>
            <XCircle size={12} className="mr-1" /> Encerrar
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onViewHistory(revenue)}>
          <History size={12} className="mr-1" /> Ver histórico
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(revenue.id)}>
          <Trash2 size={12} />
        </Button>
      </div>
    </div>
  );
}
