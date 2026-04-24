import { z } from "zod";

export const createOneTimeExpenseSchema = z.object({
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
  categoryId: z.string({ error: "Category id is required" }).min(1, "Category id is required"),
});

export type CreateOneTimeExpenseDto = z.infer<typeof createOneTimeExpenseSchema>;

export const updateOneTimeExpenseSchema = z
  .object({
    description: z
      .string()
      .min(1, "Description must be between 1 and 255 characters")
      .max(255, "Description must be between 1 and 255 characters")
      .optional(),
    amount: z.number().positive("Amount must be greater than 0").optional(),
    categoryId: z.string().min(1, "Category id is required").optional(),
    competenceYear: z
      .number()
      .int("Competence year must be an integer")
      .min(2000, "Competence year must be >= 2000")
      .optional(),
    competenceMonth: z
      .number()
      .int("Competence month must be an integer")
      .min(1, "Competence month must be between 1 and 12")
      .max(12, "Competence month must be between 1 and 12")
      .optional(),
  })
  .refine(
    (data) =>
      data.description !== undefined ||
      data.amount !== undefined ||
      data.categoryId !== undefined ||
      data.competenceYear !== undefined ||
      data.competenceMonth !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export type UpdateOneTimeExpenseDto = z.infer<typeof updateOneTimeExpenseSchema>;

export const listOneTimeExpenseQuerySchema = z.object({
  competenceYear: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value), "Competence year must be an integer")
    .refine((value) => value >= 2000, "Competence year must be >= 2000"),
  competenceMonth: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => Number.isInteger(value), "Competence month must be an integer")
    .refine((value) => value >= 1 && value <= 12, "Competence month must be between 1 and 12"),
});

export type ListOneTimeExpenseQueryDto = z.infer<typeof listOneTimeExpenseQuerySchema>;

export interface OneTimeExpenseResponseDto {
  id: string;
  userId: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}
