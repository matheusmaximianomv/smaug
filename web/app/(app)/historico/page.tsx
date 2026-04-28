"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { FilterBar } from "@/features/historico/components/FilterBar";
import { VersionTimeline } from "@/features/historico/components/VersionTimeline";
import { useVersionHistory } from "@/features/historico/hooks/useVersionHistory";
import { Skeleton } from "@/shared/components/Skeleton";
import type { HistoricoFilter } from "@/features/historico/types";

export default function HistoricoPage() {
  const [filter, setFilter] = useState<HistoricoFilter>("all");
  const { groups, isLoading } = useVersionHistory(filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <History size={20} className="text-red" />
          Histórico de Versões
        </h1>
        <p className="text-sm text-text-muted">
          Versões de receitas fixas e despesas recorrentes, agrupadas por mês de vigência.
        </p>
      </div>

      <FilterBar value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <Skeleton className="h-4 w-20" />
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="rounded-lg border border-border bg-surface px-4 py-3 space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <VersionTimeline groups={groups} />
      )}
    </div>
  );
}
