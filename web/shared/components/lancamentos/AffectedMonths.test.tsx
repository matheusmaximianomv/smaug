import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AffectedMonths } from "./AffectedMonths";
import { affectedMonths } from "../../lib/preview";

const MAY = { year: 2026, month: 5 };

describe("AffectedMonths", () => {
  it("mostra uma barra por mês com mês curto e valor", () => {
    const { months, open } = affectedMonths({
      kind: "parcelada",
      start: MAY,
      amount: 100,
      count: 3,
    });
    render(<AffectedMonths kind="parcelada" months={months} open={open} />);
    const items = screen.getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Mai/2633,34");
    expect(items[2]).toHaveTextContent("Jul/2633,33");
  });

  it('limita a 12 barras e resume o resto em "+N meses"', () => {
    const { months, open } = affectedMonths({
      kind: "parcelada",
      start: MAY,
      amount: 1800,
      count: 18,
    });
    render(<AffectedMonths kind="parcelada" months={months} open={open} />);

    expect(screen.getByText("+6 meses")).toBeInTheDocument();
    expect(screen.queryByText("continua…")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(13);
  });

  it('termina com "continua…" em série sem término', () => {
    const { months, open } = affectedMonths({ kind: "recorrente", start: MAY, amount: 89.9 });
    render(<AffectedMonths kind="recorrente" months={months} open={open} />);

    expect(screen.getByText("continua…")).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ meses/)).not.toBeInTheDocument();
  });
});
