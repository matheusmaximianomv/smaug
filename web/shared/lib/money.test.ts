import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency";
import { formatCompactCurrency, isValidMoneyInput, parseMoneyInput, toMoneyInput } from "./money";

describe("parseMoneyInput", () => {
  it.each([
    ["1.234,56", 1234.56],
    ["89,90", 89.9],
    ["100", 100],
    ["12.50", 12.5],
  ])("interpreta %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it("devolve NaN para entrada vazia ou inválida", () => {
    expect(parseMoneyInput("")).toBeNaN();
    expect(parseMoneyInput("abc")).toBeNaN();
  });
});

describe("isValidMoneyInput", () => {
  it.each(["10", "10,5", "10,55", "1.234,56", "0,01"])("aceita %s", (input) => {
    expect(isValidMoneyInput(input)).toBe(true);
  });

  it.each(["", "0", "0,00", "-5", "10,555", "abc"])("rejeita %s", (input) => {
    expect(isValidMoneyInput(input)).toBe(false);
  });
});

describe("toMoneyInput", () => {
  it("formata com vírgula e duas casas, sem separador de milhar", () => {
    expect(toMoneyInput(1234.5)).toBe("1234,50");
    expect(toMoneyInput(89.9)).toBe("89,90");
  });

  it("volta ao mesmo número quando relido", () => {
    expect(parseMoneyInput(toMoneyInput(1234.56))).toBe(1234.56);
  });
});

describe("formatCompactCurrency", () => {
  it('formata sem "R$" e sem centavos', () => {
    expect(formatCompactCurrency(3420.75)).toBe("3.420");
    expect(formatCompactCurrency(89.9)).toBe("89");
    expect(formatCompactCurrency(1234567)).toBe("1.234.567");
  });

  it("difere do formatCurrency, que emite R$ com NBSP e centavos", () => {
    expect(formatCurrency(3420.75)).toBe("R$ 3.420,75");
    expect(formatCompactCurrency(3420.75)).not.toContain("R$");
  });
});

describe("parseMoneyInput: regras pt-BR herdadas de parseAmount", () => {
  it.each([
    ["1234,56", 1234.56],
    ["0,10", 0.1],
    ["1,5", 1.5],
  ])("interpreta a vírgula como separador decimal: %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each([
    ["1.234,56", 1234.56],
    ["1.234.567,89", 1234567.89],
    ["12.345,00", 12345],
  ])("remove o separador de milhar quando há vírgula: %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each([
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["999.000", 999000],
  ])("trata grupos de 3 dígitos como milhar mesmo sem vírgula: %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each([
    ["12.50", 12.5],
    ["0.99", 0.99],
    ["1234.5", 1234.5],
  ])("aceita o ponto decimal do formato en-US: %s", (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it("ignora prefixo de moeda e espaços, inclusive o NBSP do Intl", () => {
    expect(parseMoneyInput("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoneyInput("R$ 1.234,56")).toBe(1234.56);
    expect(parseMoneyInput("  42  ")).toBe(42);
  });

  it.each(["", "   ", "abc", "12abc", "R$", ","])(
    "devolve NaN para entrada não numérica: %s",
    (input) => {
      expect(parseMoneyInput(input)).toBeNaN();
    },
  );

  it("preserva o sinal negativo para a validação rejeitar depois", () => {
    expect(parseMoneyInput("-5")).toBe(-5);
    expect(parseMoneyInput("-1.234,56")).toBe(-1234.56);
  });

  /**
   * A regressão que motivou o helper: `parseFloat(v.replace(",", "."))`
   * devolvia 1.234 para "1.234,56" — positivo, portanto aprovado na validação,
   * e o usuário gravava R$ 1,23 sem qualquer aviso.
   */
  it("não repete a falha silenciosa do parseFloat com replace único", () => {
    expect(parseFloat("1.234,56".replace(",", "."))).toBe(1.234);
    expect(parseMoneyInput("1.234,56")).toBe(1234.56);
  });
});
