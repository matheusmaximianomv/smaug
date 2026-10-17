import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EntryDetailHeader } from "./EntryDetailHeader";

describe("EntryDetailHeader", () => {
  it("mostra selo, título, subtítulo e valor em destaque", () => {
    render(
      <EntryDetailHeader
        kind="recorrente"
        title="Aluguel"
        subtitle={["Moradia", "Jan/26 → em aberto"]}
        value="R$ 150,00"
        valueCaption="por mês · valor vigente"
        tone="expense"
      />,
    );

    expect(screen.getByText("Recorrente")).toBeInTheDocument();
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getByText("Jan/26 → em aberto")).toBeInTheDocument();
    expect(screen.getByText("R$ 150,00")).toHaveClass("text-red");
    expect(screen.getByText("por mês · valor vigente")).toBeInTheDocument();
    expect(screen.queryByText(/›/)).not.toBeInTheDocument();
  });

  it("mostra a trilha do modo de ação e omite subtítulo vazio", () => {
    render(
      <EntryDetailHeader
        kind="fixa"
        crumb="Nova versão"
        title="Salário"
        subtitle={[]}
        value="R$ 5.000,00"
        valueCaption="por mês · valor vigente"
        tone="revenue"
      />,
    );

    expect(screen.getByText("› Nova versão")).toBeInTheDocument();
    expect(screen.getByText("R$ 5.000,00")).toHaveClass("text-green");
  });
});
