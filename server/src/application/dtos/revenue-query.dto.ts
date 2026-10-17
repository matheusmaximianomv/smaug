import { z } from "zod";
import { OneTimeRevenueResponseDto } from "@src/application/dtos/one-time-revenue.dto";
import {
  FixedRevenueResponseDto,
  FixedRevenueVersionResponseDto,
} from "@src/application/dtos/fixed-revenue.dto";
import type { ReferenceCompetenceDto } from "@src/application/dtos/competence.dto";
import type { CompetenceStatus } from "@src/domain/value-objects/monthly-competence.value-object";

export const revenueQuerySchema = z.object({
  competenceYear: z.coerce
    .number({ error: "Competence year is required" })
    .int()
    .min(2000, "Competence year must be >= 2000"),
  competenceMonth: z.coerce
    .number({ error: "Competence month is required" })
    .int()
    .min(1, "Competence month must be between 1 and 12")
    .max(12, "Competence month must be between 1 and 12"),
});

export type RevenueQueryDto = z.infer<typeof revenueQuerySchema>;

export interface FixedRevenueWithVersionDto extends FixedRevenueResponseDto {
  currentVersion: FixedRevenueVersionResponseDto;
  /** Valor da versão anterior quando a vigente começa neste mês; `null` nos demais casos. */
  previousAmount: number | null;
}

export interface RevenueTotalsDto {
  oneTimeTotal: number;
  fixedTotal: number;
  total: number;
}

export interface ConsolidatedRevenueResponseDto {
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: CompetenceStatus;
  reference: ReferenceCompetenceDto;
  oneTimeRevenues: OneTimeRevenueResponseDto[];
  fixedRevenues: FixedRevenueWithVersionDto[];
  totals: RevenueTotalsDto;
}

export interface RevenueYearSummaryResponseDto {
  year: number;
  reference: ReferenceCompetenceDto;
  months: Array<{
    month: number;
    competenceStatus: CompetenceStatus;
    totals: RevenueTotalsDto;
  }>;
}
