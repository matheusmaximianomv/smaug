import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterBar } from "./FilterBar";

describe("FilterBar", () => {
  it("oferece os três filtros", () => {
    render(<FilterBar value="all" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Todos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Receitas Fixas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Despesas Recorrentes" })).toBeInTheDocument();
  });

  it.each([
    ["all", "Todos"],
    ["fixed-revenues", "Receitas Fixas"],
    ["recurring-expenses", "Despesas Recorrentes"],
  ] as const)('destaca o filtro ativo "%s"', (value, label) => {
    render(<FilterBar value={value} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: label })).toHaveClass("bg-red", "text-white");
  });

  it("não destaca os filtros inativos", () => {
    render(<FilterBar value="all" onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Receitas Fixas" })).toHaveClass("bg-surface");
  });

  it.each([
    ["Todos", "all"],
    ["Receitas Fixas", "fixed-revenues"],
    ["Despesas Recorrentes", "recurring-expenses"],
  ])('clicar em "%s" chama onChange com "%s"', async (label, value) => {
    const onChange = vi.fn();
    render(<FilterBar value="all" onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: label }));

    expect(onChange).toHaveBeenCalledWith(value);
  });
});
