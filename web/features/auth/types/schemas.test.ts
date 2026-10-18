import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./schemas";

const issues = (result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

const VALID = {
  name: "Maria Souza",
  email: "maria@example.com",
  password: "senha muito segura",
  passwordConfirmation: "senha muito segura",
};

const withPassword = (password: string) => ({
  ...VALID,
  password,
  passwordConfirmation: password,
});

describe("registerSchema", () => {
  it("aceita um cadastro válido", () => {
    expect(registerSchema.safeParse(VALID).success).toBe(true);
  });

  it("exige nome e limita a 255 caracteres", () => {
    expect(issues(registerSchema.safeParse({ ...VALID, name: "" }))).toEqual({
      name: "Nome é obrigatório",
    });
    expect(issues(registerSchema.safeParse({ ...VALID, name: "x".repeat(256) }))).toEqual({
      name: "Nome muito longo",
    });
  });

  it("valida o formato do e-mail e tira os espaços das pontas", () => {
    expect(issues(registerSchema.safeParse({ ...VALID, email: "nao-e-email" }))).toEqual({
      email: "E-mail inválido",
    });
    expect(registerSchema.parse({ ...VALID, email: "  maria@example.com " }).email).toBe(
      "maria@example.com",
    );
  });

  it("limita o e-mail a 254 caracteres", () => {
    const email = `${"a".repeat(64)}@${"b".repeat(185)}.com`;

    expect(email).toHaveLength(254);
    expect(registerSchema.safeParse({ ...VALID, email }).success).toBe(true);
    expect(issues(registerSchema.safeParse({ ...VALID, email: `a${email}` }))).toMatchObject({
      email: "E-mail muito longo",
    });
  });

  it.each([
    [11, false],
    [12, true],
    [128, true],
    [129, false],
  ])("senha com %i caracteres: aceita = %s", (length, accepted) => {
    expect(registerSchema.safeParse(withPassword("a".repeat(length))).success).toBe(accepted);
  });

  it("mostra a mensagem de cada limite no campo de senha", () => {
    expect(issues(registerSchema.safeParse(withPassword("curta")))).toEqual({
      password: "A senha deve ter pelo menos 12 caracteres",
    });
    expect(issues(registerSchema.safeParse(withPassword("a".repeat(129))))).toEqual({
      password: "A senha deve ter no máximo 128 caracteres",
    });
  });

  it("conta code points após NFKC, não unidades UTF-16", () => {
    // 12 emojis ocupam 24 unidades UTF-16 e continuam sendo 12 caracteres.
    expect(registerSchema.safeParse(withPassword("😀".repeat(12))).success).toBe(true);
    // A ligadura "ﬁ" vira "fi" no NFKC: 6 ligaduras contam 12 caracteres.
    expect(registerSchema.safeParse(withPassword("ﬁ".repeat(6))).success).toBe(true);
  });

  it("mantém os espaços da senha", () => {
    const password = "  frase com espaços  ";

    expect(registerSchema.parse(withPassword(password)).password).toBe(password);
  });

  it("aponta a confirmação divergente no campo de confirmação", () => {
    expect(
      issues(registerSchema.safeParse({ ...VALID, passwordConfirmation: "outra senha qualquer" })),
    ).toEqual({ passwordConfirmation: "As senhas não coincidem" });
  });
});

describe("loginSchema", () => {
  it("aceita e-mail e senha", () => {
    expect(loginSchema.safeParse({ email: "maria@example.com", password: "x" }).success).toBe(true);
  });

  it("não aplica a política de senha do cadastro", () => {
    expect(loginSchema.safeParse({ email: "maria@example.com", password: "curta" }).success).toBe(
      true,
    );
  });

  it("exige e-mail válido e senha preenchida", () => {
    expect(issues(loginSchema.safeParse({ email: "nao-e-email", password: "" }))).toEqual({
      email: "E-mail inválido",
      password: "Informe a senha",
    });
  });

  it("pede o e-mail antes de qualquer outra mensagem quando ele está vazio", () => {
    // O formulário mostra a primeira mensagem do campo.
    const [first] = loginSchema.safeParse({ email: "", password: "x" }).error!.issues;

    expect(first).toMatchObject({ path: ["email"], message: "Informe o e-mail" });
  });
});
