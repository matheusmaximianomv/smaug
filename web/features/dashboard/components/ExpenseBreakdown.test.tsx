import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { CategoryBreakdown } from "../types";
import { ExpenseBreakdown } from "./ExpenseBreakdown";

const cat = (o: Partial<CategoryBreakdown>): CategoryBreakdown => ({
  categoryId: "cat-1",
  categoryName: "Moradia",
  amount: 1000,
  percentage: 50,
  ...o,
});

describe("ExpenseBreakdown", () => {
  it("mostra o estado vazio quando não há categorias", () => {
    render(<ExpenseBreakdown categories={[]} />);

    expect(screen.getByText("Nenhuma despesa registrada neste mês.")).toBeInTheDocument();
  });

  it("lista nome e valor formatado de cada categoria", () => {
    render(
      <ExpenseBreakdown
        categories={[
          cat({ categoryId: "cat-1", categoryName: "Moradia", amount: 2200 }),
          cat({ categoryId: "cat-2", categoryName: "Alimentação", amount: 800 }),
        ]}
      />,
    );

    expect(screen.getByText("Moradia")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.200,00/)).toBeInTheDocument();
    expect(screen.getByText("Alimentação")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?800,00/)).toBeInTheDocument();
  });

  it("arredonda a porcentagem para inteiro", () => {
    render(<ExpenseBreakdown categories={[cat({ percentage: 33.3333 })]} />);

    expect(screen.getByText("33% das despesas")).toBeInTheDocument();
  });

  it("exibe 0% sem quebrar", () => {
    render(<ExpenseBreakdown categories={[cat({ percentage: 0 })]} />);

    expect(screen.getByText("0% das despesas")).toBeInTheDocument();
  });

  it("dimensiona a barra pela porcentagem", () => {
    const { container } = render(<ExpenseBreakdown categories={[cat({ percentage: 75 })]} />);

    expect(container.querySelector(".bg-red")).toHaveStyle({ width: "75%" });
  });
});
