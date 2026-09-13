import { formatMonthYear } from "@/shared/lib/dateUtils";
import { VersionCard } from "./VersionCard";
import type { VersionHistoryGroup } from "../types";

interface VersionTimelineProps {
  groups: VersionHistoryGroup[];
}

export function VersionTimeline({ groups }: VersionTimelineProps) {
  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-text-muted text-sm">
        Nenhum histórico de versões encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={`${group.year}-${group.month}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-subtle px-2">
              {formatMonthYear(group.year, group.month)}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="rounded-lg border border-border bg-surface px-4">
            {group.entries.map((entry) => (
              <VersionCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
