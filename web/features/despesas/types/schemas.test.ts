import { describe, expect, it } from "vitest";
import { expenseDetailsSchema, recurringVersionSchema, terminateSchema } from "./schemas";

const APR = { year: 2026, month: 4 };
const schema = expenseDetailsSchema(APR);

const issues = (result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) => Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join("."), i.message]));

const base = { description: "Farmácia", amount: "50", categoryId: "cat-1", start: APR };

describe("expenseDetailsSchema", () => {
  it("aceita uma avulsa válida e remove espaços da descrição", () => {
    const result = schema.safeParse({ kind: "avulsa", ...base, description: "  Farmácia " });

    expect(result.success).toBe(true);
    expect(result.data?.description).toBe("Farmácia");
  });

  it("exige descrição, valor válido, categoria e competência não passada", () => {
    const result = schema.safeParse({
      kind: "avulsa",
      description: " ",
      amount: "10,555",
      categoryId: "",
      start: { year: 2026, month: 3 },
    });

    expect(issues(result)).toEqual({
      description: "Obrigatório",
      amount: "Valor inválido",
      categoryId: "Selecione uma categoria",
      start: "Competência passada não permitida",
    });
  });

  it.each([0, 73])("limita as parcelas entre 1 e 72 (%s)", (count) => {
    expect(issues(schema.safeParse({ kind: "parcelada", ...base, count }))).toEqual({
      count: "Entre 1 e 72",
    });
  });

  it("aceita parcelada de 72 vezes", () => {
    expect(schema.safeParse({ kind: "parcelada", ...base, count: 72 }).success).toBe(true);
  });

  it("recusa término antes do início só quando há término", () => {
    const recurring = {
      kind: "recorrente" as const,
      ...base,
      start: { year: 2026, month: 6 },
      end: { year: 2026, month: 5 },
    };

    expect(issues(schema.safeParse({ ...recurring, hasEnd: true }))).toEqual({
      end: "Deve ser igual ou posterior ao início",
    });
    expect(schema.safeParse({ ...recurring, hasEnd: false }).success).toBe(true);
  });
});

describe("recurringVersionSchema", () => {
  it("recusa vigência passada com a mensagem do PRD", () => {
    const result = recurringVersionSchema(APR).safeParse({
      description: "Aluguel",
      amount: "130",
      categoryId: "cat-1",
      from: { year: 2026, month: 3 },
    });

    expect(issues(result)).toEqual({ from: "Não é possível criar versão em competência passada" });
  });

  it("aceita a vigência no mês corrente", () => {
    expect(
      recurringVersionSchema(APR).safeParse({
        description: "Aluguel",
        amount: "130",
        categoryId: "c",
        from: APR,
      }).success,
    ).toBe(true);
  });
});

describe("terminateSchema", () => {
  it("exige encerramento igual ou posterior ao início", () => {
    const schemaFromMay = terminateSchema({ year: 2026, month: 5 });

    expect(issues(schemaFromMay.safeParse({ last: APR }))).toEqual({
      last: "Deve ser igual ou posterior ao início",
    });
    expect(schemaFromMay.safeParse({ last: { year: 2026, month: 5 } }).success).toBe(true);
  });
});
