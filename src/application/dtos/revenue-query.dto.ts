import { z } from "zod";
import { OneTimeRevenueResponseDto } from "@src/application/dtos/one-time-revenue.dto";
import { FixedRevenueResponseDto, FixedRevenueVersionResponseDto } from "@src/application/dtos/fixed-revenue.dto";

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
}

export interface ConsolidatedRevenueResponseDto {
  competenceYear: number;
  competenceMonth: number;
  oneTimeRevenues: OneTimeRevenueResponseDto[];
  fixedRevenues: FixedRevenueWithVersionDto[];
  totals: {
    oneTimeTotal: number;
    fixedTotal: number;
    total: number;
  };
}
