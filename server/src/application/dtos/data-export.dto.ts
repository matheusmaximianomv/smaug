import { z } from "zod";

export const EXPORT_MAX_MONTHS = 12;

export const dataExportQuerySchema = z
  .object({
    mode: z.enum(["period", "full"], { error: "Mode must be period or full" }),
    startYear: z.coerce.number().int().min(2000).optional(),
    startMonth: z.coerce.number().int().min(1).max(12).optional(),
    endYear: z.coerce.number().int().min(2000).optional(),
    endMonth: z.coerce.number().int().min(1).max(12).optional(),
  })
  .refine(
    (query) =>
      query.mode === "full" ||
      (query.startYear !== undefined &&
        query.startMonth !== undefined &&
        query.endYear !== undefined &&
        query.endMonth !== undefined),
    { message: "Period mode requires startYear, startMonth, endYear and endMonth" },
  );

export type DataExportQueryDto = z.infer<typeof dataExportQuerySchema>;

export type CsvEntryNature = "receita" | "despesa";
export type CsvEntryType = "avulsa" | "fixa" | "parcelada" | "recorrente";

/** Uma linha do arquivo, já no vocabulário do CSV (pt-BR) e ainda sem formatação de texto. */
export interface CsvEntryRow {
  competence: string;
  nature: CsvEntryNature;
  category: string;
  description: string;
  amount: number;
  type: CsvEntryType;
  installmentNumber: number | null;
  installmentCount: number | null;
  seriesId: string;
  observation: string;
}

export interface DataExportSummaryResponseDto {
  total: number;
  revenues: number;
  expenses: number;
  periodStart: string | null;
  periodEnd: string | null;
}
