import { TrendingUp, RotateCcw } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatCurrency";
import type { VersionHistoryEntry } from "../types";

interface VersionCardProps {
  entry: VersionHistoryEntry;
}

export function VersionCard({ entry }: VersionCardProps) {
  const isRevenue = entry.type === "fixed-revenue";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isRevenue ? "bg-green-light text-green" : "bg-[#f5f0ff] text-[#6841c7]"}`}
      >
        {isRevenue ? <TrendingUp size={13} /> : <RotateCcw size={13} />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-[13.5px] font-semibold truncate">{entry.description}</span>
          {isRevenue && entry.modality && (
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.modality === "ALTERABLE" ? "bg-green-light text-green" : "bg-border text-text-subtle"}`}
            >
              {entry.modality === "ALTERABLE" ? "Alterável" : "Não alterável"}
            </span>
          )}
          {!isRevenue && entry.categoryName && (
            <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[#f5f0ff] text-[#6841c7]">
              {entry.categoryName}
            </span>
          )}
        </div>
        <div className="text-xs text-text-muted">
          {isRevenue ? "Receita Fixa" : "Despesa Recorrente"}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className={`block text-[15px] font-bold ${isRevenue ? "text-green" : "text-red"}`}>
          {isRevenue ? "+" : "-"}
          {formatCurrency(entry.amount)}
        </span>
        <span className="text-[10px] text-text-muted">/mês</span>
      </div>
    </div>
  );
}
