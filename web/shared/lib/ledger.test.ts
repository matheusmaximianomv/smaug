import { describe, expect, it } from "vitest";
import {
  buildStripCells,
  groupRows,
  seriesPeriod,
  seriesRange,
  totalLabel,
  type LedgerRow,
} from "./ledger";

const row = (kind: LedgerRow<null>["kind"], amount: number): LedgerRow<null> => ({
  key: `${kind}-${amount}`,
  kind,
  title: kind,
  subtitle: [],
  amount,
  previousAmount: null,
  item: null,
});

describe("totalLabel", () => {
  it("usa gasto/recebido em mês passado e previsto nos demais", () => {
    expect(totalLabel("past", "expense")).toBe("Total gasto");
    expect(totalLabel("past", "revenue")).toBe("Total recebido");
    expect(totalLabel("current", "expense")).toBe("Total previsto");
    expect(totalLabel("future", "revenue")).toBe("Total previsto");
  });
});

describe("seriesPeriod / seriesRange", () => {
  it("descreve séries com e sem término", () => {
    expect(seriesPeriod({ year: 2026, month: 1 }, null)).toEqual(["desde Jan/26", "sem término"]);
    expect(seriesPeriod({ year: 2026, month: 3 }, { year: 2026, month: 12 })).toEqual([
      "desde Mar/26",
      "até Dez/26",
    ]);
    expect(seriesRange({ year: 2026, month: 1 }, null)).toBe("Jan/26 → em aberto");
    expect(seriesRange({ year: 2026, month: 1 }, { year: 2027, month: 2 })).toBe("Jan/26 → Fev/27");
  });
});

describe("groupRows", () => {
  it("agrupa na ordem pedida, soma o subtotal e omite grupos vazios", () => {
    const groups = groupRows(
      [row("avulsa", 10.1), row("recorrente", 5), row("avulsa", 0.2)],
      [
        { kind: "recorrente", title: "Recorrentes" },
        { kind: "parcelada", title: "Parceladas" },
        { kind: "avulsa", title: "Avulsas" },
      ],
    );

    expect(groups.map((g) => [g.title, g.rows.length, g.subtotal])).toEqual([
      ["Recorrentes", 1, 5],
      ["Avulsas", 2, 10.3],
    ]);
  });
});

describe("buildStripCells", () => {
  it("monta 12 células com seleção, mês corrente e totais", () => {
    const totals = Array<number | null>(12).fill(null);
    totals[3] = 3420;
    const cells = buildStripCells(2026, totals, { year: 2026, month: 6 }, { year: 2026, month: 4 });

    expect(cells).toHaveLength(12);
    expect(cells[0]).toEqual({
      month: 1,
      label: "Jan",
      total: null,
      selected: false,
      isCurrent: false,
    });
    expect(cells[3]).toMatchObject({ label: "Abr", total: 3420, isCurrent: true, selected: false });
    expect(cells[5]).toMatchObject({ label: "Jun", selected: true });
  });

  it("não marca o mês corrente nem a seleção em outro ano", () => {
    const cells = buildStripCells(2027, [], { year: 2026, month: 6 }, { year: 2026, month: 4 });

    expect(cells.some((cell) => cell.selected || cell.isCurrent)).toBe(false);
    expect(cells.every((cell) => cell.total === null)).toBe(true);
  });
});
