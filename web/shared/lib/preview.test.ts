import { describe, expect, it } from "vitest";
import { affectedMonths, seriesSpan, seriesTimeline, splitInstallments } from "./preview";

const c = (month: number, year = 2026) => ({ year, month });

// Mesmos casos de server/tests/unit/domain/entities/installment-expense.entity.test.ts:
// a prévia da Revisão precisa dividir exatamente como o servidor grava.
describe("splitInstallments", () => {
  it.each([
    [100, 3, [33.34, 33.33, 33.33]],
    [0.1, 3, [0.04, 0.03, 0.03]],
    [4800, 12, Array(12).fill(400)],
  ])("divide %s em %s parcelas como %j", (total, count, expected) => {
    expect(splitInstallments(total, count)).toEqual(expected);
  });

  it("divide 1,00 em 72 parcelas com o resto na 1ª", () => {
    const parts = splitInstallments(1, 72);

    expect(parts).toHaveLength(72);
    expect(parts[0]).toBe(0.29);
    expect(parts.slice(1).every((p) => p === 0.01)).toBe(true);
  });
});

describe("affectedMonths", () => {
  it("avulsa ocupa só a competência", () => {
    expect(affectedMonths({ kind: "avulsa", start: c(5), amount: 50 })).toEqual({
      months: [{ competence: c(5), amount: 50 }],
      open: false,
    });
  });

  it("parcelada distribui a divisão de centavos pelos meses", () => {
    const { months, open } = affectedMonths({
      kind: "parcelada",
      start: c(12),
      amount: 100,
      count: 3,
    });

    expect(months).toEqual([
      { competence: c(12), amount: 33.34 },
      { competence: c(1, 2027), amount: 33.33 },
      { competence: c(2, 2027), amount: 33.33 },
    ]);
    expect(open).toBe(false);
  });

  it("parcelada usa uma parcela quando count não é informado", () => {
    expect(affectedMonths({ kind: "parcelada", start: c(5), amount: 10 }).months).toHaveLength(1);
  });

  it("série com término ocupa do início ao fim", () => {
    const { months, open } = affectedMonths({
      kind: "fixa",
      start: c(5),
      amount: 10,
      end: c(4, 2027),
    });

    expect(months).toHaveLength(12);
    expect(months.at(-1)).toEqual({ competence: c(4, 2027), amount: 10 });
    expect(open).toBe(false);
  });

  it("série com término antes do início ainda mostra um mês", () => {
    expect(
      affectedMonths({ kind: "recorrente", start: c(6), amount: 10, end: c(5) }).months,
    ).toHaveLength(1);
  });

  it("série sem término mostra 12 meses e fica aberta", () => {
    const { months, open } = affectedMonths({ kind: "recorrente", start: c(5), amount: 89.9 });

    expect(months).toHaveLength(12);
    expect(open).toBe(true);
  });
});

describe("seriesSpan", () => {
  const reference = c(4);

  it("vai do início ao término quando há término", () => {
    const span = seriesSpan({ start: c(1), end: c(6), reference });

    expect(span.months).toHaveLength(6);
    expect(span.open).toBe(false);
    expect(span.reference).toEqual(reference);
  });

  it("sem término vai até o mês corrente + 8 e fica aberta", () => {
    const span = seriesSpan({ start: c(1), end: null, reference });

    expect(span.months.at(-1)).toEqual(c(12));
    expect(span.open).toBe(true);
  });

  it("estende até o mês extra da prévia", () => {
    expect(seriesSpan({ start: c(1), end: c(3), reference, extra: c(8) }).months.at(-1)).toEqual(
      c(8),
    );
    expect(seriesSpan({ start: c(1), end: c(9), reference, extra: c(8) }).months.at(-1)).toEqual(
      c(9),
    );
  });

  it("limita a 36 meses e marca como aberta", () => {
    const span = seriesSpan({ start: c(1, 2020), end: null, reference });

    expect(span.months).toHaveLength(36);
    expect(span.open).toBe(true);
    expect(seriesSpan({ start: c(1, 2020), end: c(12, 2026), reference }).open).toBe(true);
  });

  it("mostra ao menos o mês inicial de uma série que começa depois do horizonte", () => {
    expect(seriesSpan({ start: c(6, 2027), end: null, reference }).months).toEqual([c(6, 2027)]);
  });
});

describe("seriesTimeline", () => {
  const reference = c(4);
  const versions = [
    { effective: c(5), amount: 120 },
    { effective: c(1), amount: 100 },
  ];
  const span = seriesSpan({ start: c(1), end: c(8), reference });

  it("resolve a versão de cada mês e escreve o valor só na mudança", () => {
    const cells = seriesTimeline(versions, span);

    expect(cells.map((cell) => cell.amount)).toEqual([100, 100, 100, 100, 120, 120, 120, 120]);
    expect(cells.map((cell) => cell.versionIndex)).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    expect(cells.filter((cell) => cell.showLabel).map((cell) => cell.competence)).toEqual([
      c(1),
      c(5),
    ]);
    expect(cells.every((cell) => cell.state === "normal")).toBe(true);
  });

  it("marca o mês de referência", () => {
    const cells = seriesTimeline(versions, span);

    expect(cells.filter((cell) => cell.isReference).map((cell) => cell.competence)).toEqual([c(4)]);
  });

  it("prévia de nova versão pinta a partir de from com o novo valor", () => {
    const cells = seriesTimeline(versions, span, { mode: "version", from: c(7), amount: 130 });

    expect(cells.slice(6).map((cell) => [cell.state, cell.amount])).toEqual([
      ["new", 130],
      ["new", 130],
    ]);
    expect(cells[5].state).toBe("normal");
    expect(cells[6].showLabel).toBe(true);
    expect(cells[7].showLabel).toBe(false);
  });

  it("prévia de encerramento corta os meses depois de last", () => {
    const cells = seriesTimeline(versions, span, { mode: "end", last: c(6) });

    expect(cells.map((cell) => cell.state)).toEqual([
      "normal",
      "normal",
      "normal",
      "normal",
      "normal",
      "normal",
      "cut",
      "cut",
    ]);
    expect(cells[6].amount).toBeNull();
    expect(cells[6].showLabel).toBe(false);
  });

  it("deixa o mês sem versão com valor nulo", () => {
    const cells = seriesTimeline(
      [{ effective: c(3), amount: 50 }],
      seriesSpan({ start: c(1), end: c(3), reference }),
    );

    expect(cells.map((cell) => [cell.amount, cell.versionIndex])).toEqual([
      [null, -1],
      [null, -1],
      [50, 0],
    ]);
  });
});
