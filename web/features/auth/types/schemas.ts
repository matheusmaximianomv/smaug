import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
  email: z.string().email("Email inválido"),
});

export const loginSchema = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
