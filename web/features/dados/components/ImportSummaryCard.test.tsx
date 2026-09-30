import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportSummaryCard } from "./ImportSummaryCard";
import type { ImportResult } from "../types";

function result(overrides: Partial<ImportResult> = {}): ImportResult {
  return {
    total: 3,
    created: {
      oneTimeRevenues: 1,
      fixedRevenues: 1,
      oneTimeExpenses: 1,
      installmentExpenses: 0,
      recurringExpenses: 0,
    },
    categoriesCreated: 2,
    ...overrides,
  };
}

describe("ImportSummaryCard", () => {
  it("anuncia quantos registros foram criados", () => {
    render(<ImportSummaryCard result={result()} onRestart={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "3 registros criados" })).toBeInTheDocument();
  });

  it("usa o singular para um único registro", () => {
    render(<ImportSummaryCard result={result({ total: 1 })} onRestart={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "1 registro criado" })).toBeInTheDocument();
  });

  it("quebra o resultado por tipo", () => {
    render(<ImportSummaryCard result={result()} onRestart={vi.fn()} />);

    expect(screen.getByText("Receitas avulsas")).toBeInTheDocument();
    expect(screen.getByText("Receitas fixas")).toBeInTheDocument();
    expect(screen.getByText("Categorias criadas")).toBeInTheDocument();
  });

  it("omite os tipos que não receberam nada", () => {
    render(<ImportSummaryCard result={result()} onRestart={vi.fn()} />);

    expect(screen.queryByText("Parcelamentos")).not.toBeInTheDocument();
    expect(screen.queryByText("Despesas recorrentes")).not.toBeInTheDocument();
  });

  it("permite recomeçar com outro arquivo", async () => {
    const onRestart = vi.fn();
    render(<ImportSummaryCard result={result()} onRestart={onRestart} />);

    await userEvent.click(screen.getByRole("button", { name: "Importar outro arquivo" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
