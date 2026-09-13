import { describe, expect, it } from "vitest";
import { parseAmount } from "./parseAmount";

describe("parseAmount", () => {
  it.each([
    ["1234,56", 1234.56],
    ["0,10", 0.1],
    ["1,5", 1.5],
  ])("interpreta a vírgula como separador decimal: %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    ["1.234,56", 1234.56],
    ["1.234.567,89", 1234567.89],
    ["12.345,00", 12345],
  ])("remove o separador de milhar quando há vírgula: %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    ["1.234", 1234],
    ["1.234.567", 1234567],
    ["999.000", 999000],
  ])("trata grupos de 3 dígitos como milhar mesmo sem vírgula: %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it.each([
    ["12.50", 12.5],
    ["0.99", 0.99],
    ["1234.5", 1234.5],
  ])("aceita o ponto decimal do formato en-US: %s", (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
  });

  it("ignora prefixo de moeda e espaços, inclusive o NBSP do Intl", () => {
    expect(parseAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseAmount("R$ 1.234,56")).toBe(1234.56);
    expect(parseAmount("  42  ")).toBe(42);
  });

  it.each(["", "   ", "abc", "12abc", "R$", ","])(
    "devolve NaN para entrada não numérica: %s",
    (input) => {
      expect(parseAmount(input)).toBeNaN();
    },
  );

  it("preserva o sinal negativo para a validação rejeitar depois", () => {
    expect(parseAmount("-5")).toBe(-5);
    expect(parseAmount("-1.234,56")).toBe(-1234.56);
  });

  /**
   * A regressão que motivou o helper: `parseFloat(v.replace(",", "."))`
   * devolvia 1.234 para "1.234,56" — positivo, portanto aprovado na validação,
   * e o usuário gravava R$ 1,23 sem qualquer aviso.
   */
  it("não repete a falha silenciosa do parseFloat com replace único", () => {
    expect(parseFloat("1.234,56".replace(",", "."))).toBe(1.234);
    expect(parseAmount("1.234,56")).toBe(1234.56);
  });
});
