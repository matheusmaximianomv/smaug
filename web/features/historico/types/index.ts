export type HistoricoFilter = "all" | "fixed-revenues" | "recurring-expenses";

export interface VersionHistoryEntry {
  id: string;
  parentId: string;
  parentDescription: string;
  type: "fixed-revenue" | "recurring-expense";
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  categoryName?: string;
  modality?: "ALTERABLE" | "UNALTERABLE";
  createdAt: string;
}

export interface VersionHistoryGroup {
  year: number;
  month: number;
  entries: VersionHistoryEntry[];
}
