import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeRecurringExpense, makeRecurringExpenseVersion } from "../../../tests/fixtures";
import type { RecurringExpense } from "../types";
import { RecurringExpenseCard } from "./RecurringExpenseCard";

function renderCard(expense: RecurringExpense, current = { year: 2026, month: 9 }) {
  const handlers = {
    onAddVersion: vi.fn(),
    onTerminate: vi.fn(),
    onViewHistory: vi.fn(),
    onDelete: vi.fn(),
  };
  render(
    <RecurringExpenseCard
      expense={expense}
      {...handlers}
      currentYear={current.year}
      currentMonth={current.month}
    />,
  );
  return handlers;
}

describe("RecurringExpenseCard: conteúdo", () => {
  it("exibe a descrição, o valor e a categoria da versão vigente", () => {
    const version = makeRecurringExpenseVersion({ description: "Aluguel", amount: 2200 });
    renderCard(makeRecurringExpense({ currentVersion: version, versions: [version] }));

    expect(screen.getByTestId("recurring-expense-card")).toBeInTheDocument();
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?2\.200,00/)).toBeInTheDocument();
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it('exibe o badge "Recorrente"', () => {
    renderCard(makeRecurringExpense());

    expect(screen.getByText("Recorrente")).toBeInTheDocument();
  });

  it("não quebra quando a versão vigente não tem categoria", () => {
    const version = { ...makeRecurringExpenseVersion(), category: undefined as never };
    renderCard(makeRecurringExpense({ currentVersion: version }));

    expect(screen.queryByText("Moradia")).not.toBeInTheDocument();
  });

  it('mostra "—" e R$ 0,00 quando a versão vigente não vem', () => {
    const expense = makeRecurringExpense();
    renderCard({ ...expense, currentVersion: undefined as never });

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?0,00/)).toBeInTheDocument();
  });

  it('mostra "em aberto" quando endMonth é null', () => {
    renderCard(makeRecurringExpense({ startYear: 2026, startMonth: 9, endMonth: null }));

    expect(screen.getByText(/Vigência: Set\/26 → em aberto/)).toBeInTheDocument();
  });

  it.each([
    [1, "1 versão"],
    [2, "2 versões"],
  ])("pluraliza %i como %s", (count, text) => {
    const versions = Array.from({ length: count }, () => makeRecurringExpenseVersion());
    renderCard(makeRecurringExpense({ versions }));

    expect(screen.getByText(text)).toBeInTheDocument();
  });
});

describe("RecurringExpenseCard: encerramento", () => {
  it("marca como encerrada só quando o término é estritamente passado", () => {
    renderCard(makeRecurringExpense({ endYear: 2026, endMonth: 8 }), { year: 2026, month: 9 });

    expect(screen.getByText("Encerrada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nova versão/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Encerrar/ })).not.toBeInTheDocument();
  });

  it("NÃO marca como encerrada no mês do término", () => {
    renderCard(makeRecurringExpense({ endYear: 2026, endMonth: 9 }), { year: 2026, month: 9 });

    expect(screen.queryByText("Encerrada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nova versão/ })).toBeInTheDocument();
  });

  it("marca como encerrada quando o ano de término é anterior", () => {
    renderCard(makeRecurringExpense({ endYear: 2025, endMonth: 12 }), { year: 2026, month: 9 });

    expect(screen.getByText("Encerrada")).toBeInTheDocument();
  });

  it("com endMonth null nunca é encerrada", () => {
    renderCard(makeRecurringExpense({ endYear: 2020, endMonth: null }), { year: 2026, month: 9 });

    expect(screen.queryByText("Encerrada")).not.toBeInTheDocument();
  });
});

describe("RecurringExpenseCard: ações", () => {
  it('"Nova versão" chama onAddVersion com o registro', async () => {
    const expense = makeRecurringExpense();
    const { onAddVersion } = renderCard(expense);

    await userEvent.click(screen.getByRole("button", { name: /Nova versão/ }));

    expect(onAddVersion).toHaveBeenCalledWith(expense);
  });

  it('"Encerrar" chama onTerminate com o registro', async () => {
    const expense = makeRecurringExpense();
    const { onTerminate } = renderCard(expense);

    await userEvent.click(screen.getByRole("button", { name: /Encerrar/ }));

    expect(onTerminate).toHaveBeenCalledWith(expense);
  });

  it('"Ver histórico" chama onViewHistory com a despesa inteira', async () => {
    const expense = makeRecurringExpense();
    const { onViewHistory } = renderCard(expense);

    await userEvent.click(screen.getByRole("button", { name: /Ver histórico/ }));

    expect(onViewHistory).toHaveBeenCalledWith(expense);
  });

  it("o botão de lixeira chama onDelete com o id", async () => {
    const expense = makeRecurringExpense();
    const { onDelete } = renderCard(expense);
    const buttons = screen.getAllByRole("button");

    await userEvent.click(buttons[buttons.length - 1]);

    expect(onDelete).toHaveBeenCalledWith(expense.id);
  });
});
