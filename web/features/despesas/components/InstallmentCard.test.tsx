import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeInstallmentExpense } from "../../../tests/fixtures";
import type { InstallmentExpense } from "../types";
import { InstallmentCard } from "./InstallmentCard";

function renderCard(expense: InstallmentExpense, current = { year: 2026, month: 9 }) {
  const handlers = { onViewInstallments: vi.fn(), onDelete: vi.fn() };
  const view = render(
    <InstallmentCard
      expense={expense}
      {...handlers}
      currentYear={current.year}
      currentMonth={current.month}
    />,
  );
  return { ...handlers, ...view };
}

describe("InstallmentCard: conteúdo", () => {
  it("exibe descrição, categoria e badge de parcelada", () => {
    renderCard(makeInstallmentExpense({ description: "Notebook" }));

    expect(screen.getByTestId("installment-card")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Parcelada")).toBeInTheDocument();
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it("exibe o valor da primeira parcela e o total", () => {
    renderCard(makeInstallmentExpense({ totalAmount: 300, installmentCount: 3 }));

    expect(screen.getByText(/R\$\s?100,00/)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?300,00 total/)).toBeInTheDocument();
  });

  it("usa R$ 0,00 quando não há parcelas", () => {
    renderCard(makeInstallmentExpense({ installments: [], installmentCount: 3 }));

    expect(screen.getByText(/R\$\s?0,00/)).toBeInTheDocument();
  });

  it('mostra "—" como fim quando não há parcelas', () => {
    renderCard(
      makeInstallmentExpense({
        installments: [],
        installmentCount: 3,
        startMonth: 9,
        startYear: 2026,
      }),
    );

    expect(screen.getByText(/3× · Set\/26 → —/)).toBeInTheDocument();
  });

  it("mostra o intervalo de competências das parcelas", () => {
    renderCard(makeInstallmentExpense({ installmentCount: 12, startYear: 2026, startMonth: 9 }), {
      year: 2026,
      month: 9,
    });

    expect(screen.getByText(/12× · Set\/26 → Ago\/27/)).toBeInTheDocument();
  });

  it("não quebra quando a despesa não tem categoria", () => {
    const expense = makeInstallmentExpense();
    renderCard({ ...expense, category: undefined as never });

    expect(screen.queryByText("Moradia")).not.toBeInTheDocument();
  });
});

describe("InstallmentCard: parcelas pagas", () => {
  it("conta como paga apenas competência estritamente anterior à corrente", () => {
    renderCard(makeInstallmentExpense({ installmentCount: 3, startYear: 2026, startMonth: 9 }), {
      year: 2026,
      month: 9,
    });

    // Set, Out e Nov de 2026: nenhuma anterior a Set/26.
    expect(screen.getByText("0/3 pagas")).toBeInTheDocument();
  });

  it("conta as parcelas de meses anteriores", () => {
    renderCard(makeInstallmentExpense({ installmentCount: 3, startYear: 2026, startMonth: 9 }), {
      year: 2026,
      month: 11,
    });

    expect(screen.getByText("2/3 pagas")).toBeInTheDocument();
  });

  it("conta as parcelas de anos anteriores", () => {
    renderCard(makeInstallmentExpense({ installmentCount: 3, startYear: 2025, startMonth: 12 }), {
      year: 2026,
      month: 1,
    });

    expect(screen.getByText("1/3 pagas")).toBeInTheDocument();
  });

  it("reflete o progresso na barra", () => {
    const { container } = renderCard(
      makeInstallmentExpense({ installmentCount: 4, startYear: 2026, startMonth: 7 }),
      { year: 2026, month: 9 },
    );

    expect(container.querySelector(".bg-red.rounded-sm")).toHaveStyle({ width: "50%" });
  });
});

describe("InstallmentCard: ações", () => {
  it('"Ver parcelas" chama onViewInstallments com a despesa', async () => {
    const expense = makeInstallmentExpense();
    const { onViewInstallments } = renderCard(expense);

    await userEvent.click(screen.getByRole("button", { name: /Ver parcelas/ }));

    expect(onViewInstallments).toHaveBeenCalledWith(expense);
  });

  it("o botão de lixeira chama onDelete com o id", async () => {
    const expense = makeInstallmentExpense();
    const { onDelete } = renderCard(expense);
    const buttons = screen.getAllByRole("button");

    await userEvent.click(buttons[buttons.length - 1]);

    expect(onDelete).toHaveBeenCalledWith(expense.id);
  });
});
