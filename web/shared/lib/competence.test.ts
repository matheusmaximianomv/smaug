import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addMonths,
  compareCompetences,
  getCompetenceStatus,
  getCurrentCompetence,
  isBeforeOrEqual,
  isEligible,
  selectableYears,
} from "./competence";

const SET_26 = { year: 2026, month: 9 };

afterEach(() => {
  vi.useRealTimers();
});

describe("compareCompetences", () => {
  it("devolve negativo quando a primeira competência é anterior", () => {
    expect(compareCompetences({ year: 2026, month: 8 }, SET_26)).toBeLessThan(0);
  });

  it("devolve zero quando as competências são iguais", () => {
    expect(compareCompetences(SET_26, { year: 2026, month: 9 })).toBe(0);
  });

  it("devolve positivo quando a primeira competência é posterior", () => {
    expect(compareCompetences({ year: 2026, month: 10 }, SET_26)).toBeGreaterThan(0);
  });

  it("desempata pelo ano antes do mês", () => {
    // Dezembro de 2025 é anterior a Janeiro de 2026 apesar do mês maior.
    expect(compareCompetences({ year: 2025, month: 12 }, { year: 2026, month: 1 })).toBeLessThan(0);
    expect(compareCompetences({ year: 2027, month: 1 }, { year: 2026, month: 12 })).toBeGreaterThan(
      0,
    );
  });
});

describe("addMonths", () => {
  it("avança um mês", () => {
    expect(addMonths(SET_26, 1)).toEqual({ year: 2026, month: 10 });
  });

  it("retrocede um mês", () => {
    expect(addMonths(SET_26, -1)).toEqual({ year: 2026, month: 8 });
  });

  it("devolve a mesma competência com offset zero", () => {
    expect(addMonths(SET_26, 0)).toEqual({ year: 2026, month: 9 });
  });

  it("avança doze meses mantendo o mês", () => {
    expect(addMonths(SET_26, 12)).toEqual({ year: 2027, month: 9 });
  });

  it("faz rollover de dezembro para janeiro do ano seguinte", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
  });

  it("faz rollover de janeiro para dezembro do ano anterior", () => {
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("suporta saltos maiores que um ano", () => {
    expect(addMonths(SET_26, 15)).toEqual({ year: 2027, month: 12 });
  });
});

describe("getCurrentCompetence", () => {
  it("deriva ano e mês do relógio do sistema", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

    expect(getCurrentCompetence()).toEqual({ year: 2026, month: 9 });
  });

  it("converte o mês zero-indexado do Date para 1-indexado", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    expect(getCurrentCompetence()).toEqual({ year: 2026, month: 1 });
  });
});

describe("getCompetenceStatus", () => {
  it('devolve "current" para a própria referência', () => {
    expect(getCompetenceStatus(SET_26, SET_26)).toBe("current");
  });

  it('devolve "past" para competência anterior à referência', () => {
    expect(getCompetenceStatus({ year: 2026, month: 8 }, SET_26)).toBe("past");
  });

  it('devolve "future" para competência posterior à referência', () => {
    expect(getCompetenceStatus({ year: 2026, month: 10 }, SET_26)).toBe("future");
  });

  it("usa a competência de hoje quando a referência é omitida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

    expect(getCompetenceStatus({ year: 2026, month: 9 })).toBe("current");
    expect(getCompetenceStatus({ year: 2026, month: 8 })).toBe("past");
    expect(getCompetenceStatus({ year: 2026, month: 10 })).toBe("future");
  });
});

describe("isEligible", () => {
  it("aceita o mês atual", () => {
    expect(isEligible(SET_26, SET_26)).toBe(true);
  });

  it("aceita competências futuras", () => {
    expect(isEligible({ year: 2027, month: 1 }, SET_26)).toBe(true);
  });

  it("rejeita competências passadas", () => {
    expect(isEligible({ year: 2026, month: 8 }, SET_26)).toBe(false);
  });

  it("usa a competência de hoje quando a referência é omitida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

    expect(isEligible({ year: 2026, month: 9 })).toBe(true);
    expect(isEligible({ year: 2026, month: 8 })).toBe(false);
  });
});

describe("isBeforeOrEqual", () => {
  it("devolve true quando a primeira é anterior", () => {
    expect(isBeforeOrEqual({ year: 2026, month: 1 }, SET_26)).toBe(true);
  });

  it("devolve true quando são iguais", () => {
    expect(isBeforeOrEqual(SET_26, SET_26)).toBe(true);
  });

  it("devolve false quando a primeira é posterior", () => {
    expect(isBeforeOrEqual({ year: 2026, month: 10 }, SET_26)).toBe(false);
  });
});

describe("selectableYears", () => {
  it("oferece 5 anos começando no ano anterior à referência", () => {
    expect(selectableYears(SET_26)).toEqual([2025, 2026, 2027, 2028, 2029]);
  });

  it("usa o ano de hoje quando a referência é omitida", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));

    expect(selectableYears()).toEqual([2025, 2026, 2027, 2028, 2029]);
  });
});
