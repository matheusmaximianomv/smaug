import { z } from "zod";

const descriptionSchema = z
  .string({ error: "Description is required" })
  .min(1, "Description must be between 1 and 255 characters")
  .max(255, "Description must be between 1 and 255 characters");

const amountSchema = z
  .number({ error: "Amount must be a number" })
  .positive("Amount must be greater than 0")
  .refine((value) => Number.isInteger(Math.round(value * 100)), "Amount must have at most 2 decimal places");

const competenceYearSchema = z
  .number({ error: "Competence year is required" })
  .int("Competence year must be an integer")
  .min(2000, "Competence year must be >= 2000");

const competenceMonthSchema = z
  .number({ error: "Competence month is required" })
  .int("Competence month must be an integer")
  .min(1, "Competence month must be between 1 and 12")
  .max(12, "Competence month must be between 1 and 12");

export const createRecurringExpenseSchema = z
  .object({
    description: descriptionSchema,
    amount: amountSchema,
    categoryId: z.string({ error: "Category id is required" }).min(1, "Category id is required"),
    startYear: competenceYearSchema,
    startMonth: competenceMonthSchema,
    endYear: competenceYearSchema.optional().nullable(),
    endMonth: competenceMonthSchema.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasEndYear = data.endYear !== undefined && data.endYear !== null;
    const hasEndMonth = data.endMonth !== undefined && data.endMonth !== null;
    if (hasEndYear !== hasEndMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End month and year must both be provided",
        path: ["endMonth"],
      });
    }
  });

export type CreateRecurringExpenseDto = z.infer<typeof createRecurringExpenseSchema>;

export const updateRecurringExpenseSchema = z
  .object({
    description: z
      .string()
      .min(1, "Description must be between 1 and 255 characters")
      .max(255, "Description must be between 1 and 255 characters")
      .optional(),
    amount: z
      .number()
      .positive("Amount must be greater than 0")
      .refine((value) => Number.isInteger(Math.round(value * 100)), "Amount must have at most 2 decimal places")
      .optional(),
    categoryId: z.string().min(1, "Category id is required").optional(),
    effectiveYear: competenceYearSchema,
    effectiveMonth: competenceMonthSchema,
  })
  .refine(
    (data) => data.description !== undefined || data.amount !== undefined || data.categoryId !== undefined,
    {
      message: "At least one field must be provided",
      path: ["description"],
    },
  );

export type UpdateRecurringExpenseDto = z.infer<typeof updateRecurringExpenseSchema>;

export const terminateRecurringExpenseSchema = z.object({
  endYear: competenceYearSchema,
  endMonth: competenceMonthSchema,
});

export type TerminateRecurringExpenseDto = z.infer<typeof terminateRecurringExpenseSchema>;

export interface RecurringExpenseVersionDto {
  id: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}

export interface RecurringExpenseResponseDto {
  id: string;
  userId: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  currentVersion: RecurringExpenseVersionDto;
  versions: RecurringExpenseVersionDto[];
  createdAt: string;
  updatedAt: string;
}
