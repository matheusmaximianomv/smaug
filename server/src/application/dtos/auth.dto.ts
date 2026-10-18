import { z } from "zod";
import { EmailAddress } from "@src/domain/value-objects/email-address.value-object";
import { PasswordPolicy } from "@src/domain/value-objects/password-policy.value-object";
import { UserResponseDto } from "@src/application/dtos/user.dto";

const MAX_LOGIN_PASSWORD_LENGTH = 128;

/**
 * Aplica a regra do value object como refinamento do Zod: a mensagem do 400 é exatamente a que o
 * domínio lançaria, e a regra (normalização do e-mail, contagem NFKC da senha) tem uma só fonte.
 */
const domainRule =
  (assert: (value: string) => unknown) =>
  (value: string, ctx: z.RefinementCtx): void => {
    try {
      assert(value);
    } catch (error) {
      ctx.addIssue({ code: "custom", message: (error as Error).message });
    }
  };

const emailField = z
  .string({ error: "Email is required" })
  .superRefine(domainRule((value) => EmailAddress.create(value)));

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required" })
    .min(1, "Name must be between 1 and 255 characters")
    .max(255, "Name must be between 1 and 255 characters"),
  email: emailField,
  password: z
    .string({ error: "Password is required" })
    .superRefine(domainRule((value) => PasswordPolicy.assert(value))),
});

export type RegisterDto = z.infer<typeof registerSchema>;

/** No login a política de senha não se aplica (não revela nada da cadastrada): só o teto de tamanho. */
export const loginSchema = z.object({
  email: emailField,
  password: z
    .string({ error: "Password is required" })
    .refine(
      (value) => [...value.normalize("NFKC")].length <= MAX_LOGIN_PASSWORD_LENGTH,
      "Password must be at most 128 characters",
    ),
});

export type LoginDto = z.infer<typeof loginSchema>;

export interface AuthSessionResponseDto {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: UserResponseDto;
}

/**
 * O que o service devolve ao controller: o corpo da resposta e, à parte, o refresh token em claro
 * com a sua expiração — que o controller põe no cookie. O refresh nunca entra no corpo.
 */
export interface AuthSessionResult {
  response: AuthSessionResponseDto;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
