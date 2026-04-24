import { z } from "zod";

export const expenseQuerySchema = z.object({
  competenceYear: z.coerce
    .number({ error: "Competence year is required" })
    .int("Competence year must be an integer")
    .min(2000, "Competence year must be >= 2000"),
  competenceMonth: z.coerce
    .number({ error: "Competence month is required" })
    .int("Competence month must be an integer")
    .min(1, "Competence month must be between 1 and 12")
    .max(12, "Competence month must be between 1 and 12"),
});

export type ExpenseQueryDto = z.infer<typeof expenseQuerySchema>;

export type ExpenseType = "ONE_TIME" | "INSTALLMENT" | "RECURRING";

export interface ExpenseCategoryDto {
  id: string;
  name: string;
}

export interface BaseExpenseItemDto {
  id: string;
  type: ExpenseType;
  userId: string;
  categoryId: string;
  category: ExpenseCategoryDto;
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OneTimeExpenseItemDto extends BaseExpenseItemDto {
  type: "ONE_TIME";
  competenceYear: number;
  competenceMonth: number;
}

export interface InstallmentExpenseItemDto extends BaseExpenseItemDto {
  type: "INSTALLMENT";
  installmentExpenseId: string;
  installmentNumber: number;
  installmentCount: number;
  totalAmount: number;
  startYear: number;
  startMonth: number;
}

export interface RecurringExpenseItemDto extends BaseExpenseItemDto {
  type: "RECURRING";
  recurringExpenseId: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  effectiveYear: number;
  effectiveMonth: number;
  versionId: string;
}

export type ExpenseQueryItemDto =
  | OneTimeExpenseItemDto
  | InstallmentExpenseItemDto
  | RecurringExpenseItemDto;

export interface ExpenseQueryResponseDto {
  competenceYear: number;
  competenceMonth: number;
  expenses: ExpenseQueryItemDto[];
  totals: {
    oneTime: number;
    installment: number;
    recurring: number;
    total: number;
  };
}
