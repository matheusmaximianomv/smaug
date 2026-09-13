import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { KpiCard } from "./KpiCard";

describe("KpiCard", () => {
  it("exibe rótulo, valor formatado e sublabel", () => {
    render(<KpiCard label="Receitas" value={5000} sublabel="3 lançamentos" colorScheme="green" />);

    expect(screen.getByText("Receitas")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?5\.000,00/)).toBeInTheDocument();
    expect(screen.getByText("3 lançamentos")).toBeInTheDocument();
  });

  it("formata valor negativo com o sinal antes do símbolo", () => {
    render(<KpiCard label="Saldo" value={-250} sublabel="Déficit" colorScheme="negative" />);

    expect(screen.getByText(/^-R\$\s?250,00$/)).toBeInTheDocument();
  });

  it.each([
    ["green", "border-l-green"],
    ["red", "border-l-red"],
    ["positive", "border-l-green"],
    ["negative", "border-l-red"],
  ] as const)('aplica a cor do esquema "%s"', (colorScheme, expected) => {
    const { container } = render(
      <KpiCard label="Saldo" value={0} sublabel="—" colorScheme={colorScheme} />,
    );

    expect(container.firstChild).toHaveClass(expected);
  });
});
