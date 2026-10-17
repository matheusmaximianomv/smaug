import { z } from "zod";

/** `GET /expenses/summary` e `GET /revenues/summary`. */
export const yearSummaryQuerySchema = z.object({
  year: z.coerce
    .number({ error: "Year is required" })
    .int("Year must be an integer")
    .min(2000, "Year must be >= 2000"),
});

export type YearSummaryQueryDto = z.infer<typeof yearSummaryQuerySchema>;

/** Mês corrente do servidor (UTC): o "agora" que o front usa no lugar do relógio local. */
export interface ReferenceCompetenceDto {
  year: number;
  month: number;
}

export function toReferenceDto(competence: {
  year: number;
  month: number;
}): ReferenceCompetenceDto {
  return { year: competence.year, month: competence.month };
}
