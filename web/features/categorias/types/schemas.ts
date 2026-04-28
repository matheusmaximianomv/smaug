import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
