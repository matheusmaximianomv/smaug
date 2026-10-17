import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MonthSummary } from "./MonthSummary";

const SEGMENTS = [
  { kind: "recorrente" as const, label: "Recorrentes", amount: 0 },
  { kind: "parcelada" as const, label: "Parceladas", amount: 0 },
  { kind: "avulsa" as const, label: "Avulsas", amount: 150 },
];

describe("MonthSummary", () => {
  it("mostra rótulo, total colorido pela natureza e contagem no plural", () => {
    render(
      <MonthSummary label="Total gasto" total={150} count={2} tone="expense" segments={SEGMENTS} />,
    );
    const summary = screen.getByRole("region", { name: "Resumo do mês" });

    expect(within(summary).getByText("Total gasto")).toBeInTheDocument();
    expect(within(summary).getAllByText("R$ 150,00")[0]).toHaveClass("text-red");
    expect(within(summary).getByText("2 lançamentos")).toBeInTheDocument();
  });

  it("usa o singular e o verde de receitas", () => {
    render(
      <MonthSummary
        label="Total previsto"
        total={10}
        count={1}
        tone="revenue"
        segments={[{ kind: "avulsa", label: "Avulsas", amount: 10 }]}
      />,
    );

    expect(screen.getByText("1 lançamento")).toBeInTheDocument();
    expect(screen.getAllByText("R$ 10,00")[0]).toHaveClass("text-green");
  });

  it("lista todos os tipos na legenda, inclusive os zerados", () => {
    render(
      <MonthSummary label="Total gasto" total={150} count={1} tone="expense" segments={SEGMENTS} />,
    );
    const items = screen.getAllByRole("listitem");

    expect(items.map((item) => item.textContent?.replace(/\u00a0/g, " "))).toEqual([
      "RecorrentesR$ 0,00",
      "ParceladasR$ 0,00",
      "AvulsasR$ 150,00",
    ]);
  });
});
