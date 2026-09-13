import { describe, expect, it } from "vitest";
import { MONTH_NAMES_FULL, formatMonthYear } from "./dateUtils";

describe("formatMonthYear", () => {
  it("formata setembro de 2026 como Set/26", () => {
    expect(formatMonthYear(2026, 9)).toBe("Set/26");
  });

  it("formata o primeiro mês como Jan/26", () => {
    expect(formatMonthYear(2026, 1)).toBe("Jan/26");
  });

  it("formata o último mês como Dez/26", () => {
    expect(formatMonthYear(2026, 12)).toBe("Dez/26");
  });

  it("usa os dois últimos dígitos do ano, preservando o zero", () => {
    expect(formatMonthYear(2000, 3)).toBe("Mar/00");
  });

  it.each([
    [1, "Jan"],
    [2, "Fev"],
    [3, "Mar"],
    [4, "Abr"],
    [5, "Mai"],
    [6, "Jun"],
    [7, "Jul"],
    [8, "Ago"],
    [9, "Set"],
    [10, "Out"],
    [11, "Nov"],
    [12, "Dez"],
  ])("abrevia o mês %i como %s", (month, short) => {
    expect(formatMonthYear(2026, month)).toBe(`${short}/26`);
  });
});

describe("MONTH_NAMES_FULL", () => {
  it("tem 12 entradas", () => {
    expect(MONTH_NAMES_FULL).toHaveLength(12);
  });

  it('começa em "Janeiro" e termina em "Dezembro"', () => {
    expect(MONTH_NAMES_FULL[0]).toBe("Janeiro");
    expect(MONTH_NAMES_FULL[11]).toBe("Dezembro");
  });

  it("usa a grafia com cedilha em Março", () => {
    expect(MONTH_NAMES_FULL[2]).toBe("Março");
  });
});
