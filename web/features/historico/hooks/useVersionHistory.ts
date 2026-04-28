import { useQuery } from "@tanstack/react-query";
import { HistoricoService } from "../services/HistoricoService";
import type { VersionHistoryGroup, HistoricoFilter } from "../types";

export function useVersionHistory(filter: HistoricoFilter) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["version-history"],
    queryFn: HistoricoService.getGroups,
    staleTime: 30_000,
  });

  const groups: VersionHistoryGroup[] = (data ?? [])
    .map((group) => ({
      ...group,
      entries: group.entries.filter((e) => {
        if (filter === "fixed-revenues") return e.type === "fixed-revenue";
        if (filter === "recurring-expenses") return e.type === "recurring-expense";
        return true;
      }),
    }))
    .filter((g) => g.entries.length > 0);

  return { groups, isLoading, error, refetch };
}
