import { z } from "zod";

const NAME_VALIDATION_MESSAGE = "Name must be between 1 and 100 characters";

export const createExpenseCategorySchema = z.object({
  name: z
    .string({ error: NAME_VALIDATION_MESSAGE })
    .trim()
    .min(1, NAME_VALIDATION_MESSAGE)
    .max(100, NAME_VALIDATION_MESSAGE),
});

export type CreateExpenseCategoryDto = z.infer<typeof createExpenseCategorySchema>;

export const updateExpenseCategorySchema = z.object({
  name: z
    .string({ error: NAME_VALIDATION_MESSAGE })
    .trim()
    .min(1, NAME_VALIDATION_MESSAGE)
    .max(100, NAME_VALIDATION_MESSAGE),
});

export type UpdateExpenseCategoryDto = z.infer<typeof updateExpenseCategorySchema>;

export interface ExpenseCategoryResponseDto {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
