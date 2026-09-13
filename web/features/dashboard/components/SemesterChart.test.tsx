import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MonthChartData } from "../types";
import { SemesterChart } from "./SemesterChart";

const month = (o: Partial<MonthChartData>): MonthChartData => ({
  year: 2026,
  month: 9,
  label: "Set",
  revenues: 1000,
  expenses: 500,
  isFuture: false,
  ...o,
});

function bars(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(".rounded-t-sm"));
}

describe("SemesterChart", () => {
  it("renderiza um rótulo por mês", () => {
    render(
      <SemesterChart
        months={[month({ month: 8, label: "Ago" }), month({ month: 9, label: "Set" })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(screen.getByText("Ago")).toBeInTheDocument();
    expect(screen.getByText("Set")).toBeInTheDocument();
  });

  it("destaca o mês selecionado", () => {
    render(
      <SemesterChart
        months={[month({ month: 8, label: "Ago" }), month({ month: 9, label: "Set" })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(screen.getByText("Set")).toHaveClass("font-bold");
    expect(screen.getByText("Ago")).not.toHaveClass("font-bold");
  });

  it("chama onSelectMonth com ano e mês da coluna clicada", async () => {
    const onSelectMonth = vi.fn();
    render(
      <SemesterChart
        months={[month({ year: 2026, month: 8, label: "Ago" })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={onSelectMonth}
      />,
    );

    await userEvent.click(screen.getByText("Ago"));

    expect(onSelectMonth).toHaveBeenCalledWith(2026, 8);
  });

  it("descreve receitas e despesas no title da coluna", () => {
    const { container } = render(
      <SemesterChart
        months={[month({ label: "Set", revenues: 1000, expenses: 500 })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(container.querySelector("[title]")?.getAttribute("title")).toMatch(
      /Set: Receitas R\$.1\.000,00 \| Despesas R\$.500,00/,
    );
  });

  it("não divide por zero quando todos os meses estão zerados (maxVal usa Math.max(…, 1))", () => {
    const { container } = render(
      <SemesterChart
        months={[month({ revenues: 0, expenses: 0 })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    for (const bar of bars(container)) {
      expect(bar.style.height).toBe("0%");
      expect(bar.style.height).not.toContain("NaN");
    }
  });

  it("dá altura mínima de 2% a um valor positivo muito pequeno", () => {
    const { container } = render(
      <SemesterChart
        months={[month({ revenues: 1, expenses: 100000 })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    const [revenueBar, expenseBar] = bars(container);
    expect(revenueBar.style.height).toBe("2%");
    expect(expenseBar.style.height).toBe("100%");
  });

  it("aplica o hachurado de projeção nos meses futuros", () => {
    const { container } = render(
      <SemesterChart
        months={[month({ isFuture: true })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    for (const bar of bars(container)) {
      expect(bar.className).toContain("repeating-linear-gradient");
      expect(bar).toHaveClass("opacity-60");
    }
  });

  it("não aplica hachurado em meses não futuros", () => {
    const { container } = render(
      <SemesterChart
        months={[month({ isFuture: false })]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    for (const bar of bars(container)) {
      expect(bar.className).not.toContain("repeating-linear-gradient");
    }
  });

  it("exibe a legenda de receitas, despesas e projeção", () => {
    render(
      <SemesterChart
        months={[month({})]}
        selectedYear={2026}
        selectedMonth={9}
        onSelectMonth={vi.fn()}
      />,
    );

    expect(screen.getByText("Receitas")).toBeInTheDocument();
    expect(screen.getByText("Despesas")).toBeInTheDocument();
    expect(screen.getByText("Projeção")).toBeInTheDocument();
  });
});
