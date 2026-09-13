import { describe, expect, it } from "vitest";
import { formatCurrency } from "./formatCurrency";

/**
 * `Intl.NumberFormat("pt-BR")` separa "R$" do número com NBSP (U+00A0), não com
 * espaço comum. As strings esperadas aqui carregam o NBSP literal — é o que
 * `toBe` compara. Em queries do Testing Library o normalizador colapsa NBSP em
 * espaço, então lá o espaço comum funciona.
 */
const NBSP = " ";

describe("formatCurrency", () => {
  it("formata um valor positivo com separador de milhar e decimal pt-BR", () => {
    expect(formatCurrency(1234.56)).toBe(`R$${NBSP}1.234,56`);
  });

  it("formata zero", () => {
    expect(formatCurrency(0)).toBe(`R$${NBSP}0,00`);
  });

  it("coloca o sinal negativo antes do símbolo da moeda", () => {
    expect(formatCurrency(-50)).toBe(`-R$${NBSP}50,00`);
  });

  it("usa ponto como separador de milhar em valores grandes", () => {
    expect(formatCurrency(1000000)).toBe(`R$${NBSP}1.000.000,00`);
  });

  it("sempre exibe duas casas decimais", () => {
    expect(formatCurrency(7)).toBe(`R$${NBSP}7,00`);
    expect(formatCurrency(0.1)).toBe(`R$${NBSP}0,10`);
  });

  it("arredonda valores com três casas decimais", () => {
    expect(formatCurrency(2.675)).toBe(`R$${NBSP}2,68`);
    expect(formatCurrency(2.674)).toBe(`R$${NBSP}2,67`);
  });

  it("usa NBSP entre o símbolo e o número", () => {
    expect(formatCurrency(1)).toContain(NBSP);
    expect(formatCurrency(1)).not.toBe("R$ 1,00");
  });
});
