import { z } from "zod";

export const createInstallmentExpenseSchema = z.object({
  description: z
    .string({ error: "Description is required" })
    .min(1, "Description must be between 1 and 255 characters")
    .max(255, "Description must be between 1 and 255 characters"),
  totalAmount: z
    .number({ error: "Total amount must be a number" })
    .positive("Total amount must be greater than 0")
    .refine((value) => Number.isInteger(Math.round(value * 100)), "Total amount must have at most 2 decimal places"),
  installmentCount: z
    .number({ error: "Installment count is required" })
    .int("Installment count must be an integer")
    .min(1, "Installment count must be between 1 and 72")
    .max(72, "Installment count must be between 1 and 72"),
  startYear: z
    .number({ error: "Start year is required" })
    .int("Start year must be an integer")
    .min(2000, "Start year must be >= 2000"),
  startMonth: z
    .number({ error: "Start month is required" })
    .int("Start month must be an integer")
    .min(1, "Start month must be between 1 and 12")
    .max(12, "Start month must be between 1 and 12"),
  categoryId: z.string({ error: "Category id is required" }).min(1, "Category id is required"),
});

export type CreateInstallmentExpenseDto = z.infer<typeof createInstallmentExpenseSchema>;

export const updateInstallmentExpenseSchema = z
  .object({
    description: z
      .string()
      .min(1, "Description must be between 1 and 255 characters")
      .max(255, "Description must be between 1 and 255 characters")
      .optional(),
    categoryId: z.string().min(1, "Category id is required").optional(),
  })
  .refine((data) => data.description !== undefined || data.categoryId !== undefined, {
    message: "At least one field must be provided",
  });

export type UpdateInstallmentExpenseDto = z.infer<typeof updateInstallmentExpenseSchema>;

export interface InstallmentDto {
  id: string;
  installmentNumber: number;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
}

export interface InstallmentExpenseResponseDto {
  id: string;
  userId: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  description: string;
  totalAmount: number;
  installmentCount: number;
  startYear: number;
  startMonth: number;
  installments: InstallmentDto[];
  createdAt: string;
  updatedAt: string;
}
