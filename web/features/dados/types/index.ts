export type ExportMode = "period" | "full";

export interface ExportParams {
  mode: ExportMode;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

export interface ExportSummary {
  total: number;
  revenues: number;
  expenses: number;
  periodStart: string | null;
  periodEnd: string | null;
}

export interface ImportRowError {
  line: number;
  code: string;
  value?: string;
}

export interface ImportCounts {
  oneTime: number;
  fixed: number;
  installment: number;
  recurring: number;
  series: number;
}

export interface ImportPreview {
  validRows: number;
  errors: ImportRowError[];
  counts: ImportCounts;
}

export interface ImportCreated {
  oneTimeRevenues: number;
  fixedRevenues: number;
  oneTimeExpenses: number;
  installmentExpenses: number;
  recurringExpenses: number;
}

export interface ImportResult {
  total: number;
  created: ImportCreated;
  categoriesCreated: number;
}
