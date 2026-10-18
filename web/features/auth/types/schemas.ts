import { z } from "zod";

/** Limites de RN-03, contados em code points após NFKC — a mesma conta que o servidor faz. */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

function passwordLength(value: string): number {
  return [...value.normalize("NFKC")].length;
}

const email = z
  .string()
  .trim()
  .min(1, "Informe o e-mail")
  .max(254, "E-mail muito longo")
  .email("E-mail inválido");

export const registerSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório").max(255, "Nome muito longo"),
    email,
    // Sem `trim`: espaços fazem parte da senha (RN-03).
    password: z
      .string()
      .refine((value) => passwordLength(value) >= PASSWORD_MIN_LENGTH, {
        message: `A senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
      })
      .refine((value) => passwordLength(value) <= PASSWORD_MAX_LENGTH, {
        message: `A senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
      }),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    message: "As senhas não coincidem",
    path: ["passwordConfirmation"],
  });

/** A política de senha não vale no login: ele não pode revelar nada sobre a senha cadastrada. */
export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe a senha"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
