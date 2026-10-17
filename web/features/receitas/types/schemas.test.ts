import { describe, expect, it } from "vitest";
import { fixedVersionSchema, revenueDetailsSchema, terminateSchema } from "./schemas";

const APR = { year: 2026, month: 4 };
const issues = (result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

describe("revenueDetailsSchema", () => {
  const schema = revenueDetailsSchema(APR);

  it("aceita uma avulsa válida", () => {
    expect(
      schema.safeParse({ kind: "avulsa", description: "Freelance", amount: "800", start: APR })
        .success,
    ).toBe(true);
  });

  it("exige descrição, valor válido e competência não passada", () => {
    const result = schema.safeParse({
      kind: "avulsa",
      description: "",
      amount: "0",
      start: { year: 2026, month: 3 },
    });

    expect(issues(result)).toEqual({
      description: "Obrigatório",
      amount: "Valor inválido",
      start: "Competência passada não permitida",
    });
  });

  it("valida o fim da vigência só quando há término", () => {
    const fixa = {
      kind: "fixa" as const,
      description: "Salário",
      amount: "5000",
      start: { year: 2026, month: 6 },
      end: { year: 2026, month: 5 },
      modality: "ALTERABLE" as const,
    };

    expect(issues(schema.safeParse({ ...fixa, hasEnd: true }))).toEqual({
      end: "Deve ser igual ou posterior ao início",
    });
    expect(schema.safeParse({ ...fixa, hasEnd: false }).success).toBe(true);
  });
});

describe("fixedVersionSchema", () => {
  it("recusa vigência passada", () => {
    const result = fixedVersionSchema(APR).safeParse({
      description: "Salário",
      amount: "10",
      from: { year: 2026, month: 1 },
    });

    expect(issues(result)).toEqual({ from: "Não é possível criar versão em competência passada" });
  });

  it("aceita vigência no mês corrente", () => {
    expect(
      fixedVersionSchema(APR).safeParse({ description: "Salário", amount: "10", from: APR })
        .success,
    ).toBe(true);
  });
});

describe("terminateSchema", () => {
  it("exige encerramento igual ou posterior ao início", () => {
    const schema = terminateSchema({ year: 2026, month: 5 });

    expect(issues(schema.safeParse({ last: APR }))).toEqual({
      last: "Deve ser igual ou posterior ao início",
    });
    expect(schema.safeParse({ last: { year: 2026, month: 5 } }).success).toBe(true);
  });
});
