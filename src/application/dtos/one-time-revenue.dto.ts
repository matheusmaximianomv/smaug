import { z } from "zod";

export const createOneTimeRevenueSchema = z.object({
  description: z
    .string({ error: "Description is required" })
    .min(1, "Description must be between 1 and 255 characters")
    .max(255, "Description must be between 1 and 255 characters"),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  competenceYear: z
    .number({ error: "Competence year is required" })
    .int("Competence year must be an integer")
    .min(2000, "Competence year must be >= 2000"),
  competenceMonth: z
    .number({ error: "Competence month is required" })
    .int("Competence month must be an integer")
    .min(1, "Competence month must be between 1 and 12")
    .max(12, "Competence month must be between 1 and 12"),
});

export type CreateOneTimeRevenueDto = z.infer<typeof createOneTimeRevenueSchema>;

export const updateOneTimeRevenueSchema = z
  .object({
    description: z
      .string()
      .min(1, "Description must be between 1 and 255 characters")
      .max(255, "Description must be between 1 and 255 characters")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
  })
  .refine((data) => data.description !== undefined || data.amount !== undefined, {
    message: "At least one field (description or amount) must be provided",
  });

export type UpdateOneTimeRevenueDto = z.infer<typeof updateOneTimeRevenueSchema>;

export interface OneTimeRevenueResponseDto {
  id: string;
  userId: string;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}
