import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoricoPage from "@/app/(app)/historico/page";
import { renderWithProviders } from "../render";
import { seedDb } from "../msw";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../fixtures";
import { recordRequests } from "../requests";

/** Uma receita fixa em Out/26 e uma despesa recorrente em Set/26. */
function seedTwoMonths() {
  const rv = makeFixedRevenueVersion({
    description: "Salário",
    amount: 8000,
    effectiveYear: 2026,
    effectiveMonth: 10,
  });
  const ev = makeRecurringExpenseVersion({
    description: "Aluguel",
    amount: 2200,
    effectiveYear: 2026,
    effectiveMonth: 9,
  });
  seedDb({
    fixedRevenues: [makeFixedRevenue({ currentVersion: rv, versions: [rv] })],
    recurringExpenses: [makeRecurringExpense({ currentVersion: ev, versions: [ev] })],
  });
}

function renderPage() {
  return renderWithProviders(<HistoricoPage />, { pathname: "/historico" });
}

describe("página de histórico", () => {
  it("mostra esqueletos antes da resposta", () => {
    const { container } = renderPage();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("mostra o estado vazio quando não há versões", async () => {
    renderPage();

    expect(await screen.findByText("Nenhum histórico de versões encontrado.")).toBeInTheDocument();
  });

  it("agrupa as versões por mês em ordem decrescente", async () => {
    seedTwoMonths();
    renderPage();

    await screen.findByText("Salário");
    const headers = screen.getAllByText(/^\w{3}\/\d{2}$/).map((el) => el.textContent);
    expect(headers).toEqual(["Out/26", "Set/26"]);
  });

  it('o filtro "Receitas Fixas" remove o grupo que fica sem entradas', async () => {
    seedTwoMonths();
    renderPage();
    await screen.findByText("Salário");

    await userEvent.click(screen.getByRole("button", { name: "Receitas Fixas" }));

    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.queryByText("Aluguel")).not.toBeInTheDocument();
    expect(screen.getByText("Out/26")).toBeInTheDocument();
    expect(screen.queryByText("Set/26")).not.toBeInTheDocument();
  });

  it('o filtro "Despesas Recorrentes" mantém só a despesa', async () => {
    seedTwoMonths();
    renderPage();
    await screen.findByText("Salário");

    await userEvent.click(screen.getByRole("button", { name: "Despesas Recorrentes" }));

    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.queryByText("Salário")).not.toBeInTheDocument();
    expect(screen.getByText("Set/26")).toBeInTheDocument();
    expect(screen.queryByText("Out/26")).not.toBeInTheDocument();
  });

  it('voltar para "Todos" restaura os dois grupos', async () => {
    seedTwoMonths();
    renderPage();
    await screen.findByText("Salário");

    await userEvent.click(screen.getByRole("button", { name: "Receitas Fixas" }));
    await userEvent.click(screen.getByRole("button", { name: "Todos" }));

    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText("Aluguel")).toBeInTheDocument();
  });

  it("trocar o filtro NÃO dispara novo request", async () => {
    seedTwoMonths();
    renderPage();
    await screen.findByText("Salário");
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: "Receitas Fixas" }));
    await userEvent.click(screen.getByRole("button", { name: "Despesas Recorrentes" }));
    await userEvent.click(screen.getByRole("button", { name: "Todos" }));

    expect(calls).toHaveLength(0);
  });

  it("mostra um filtro vazio como timeline vazia, sem quebrar", async () => {
    const ev = makeRecurringExpenseVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    seedDb({ recurringExpenses: [makeRecurringExpense({ currentVersion: ev, versions: [ev] })] });
    renderPage();
    await screen.findByText("Aluguel");

    await userEvent.click(screen.getByRole("button", { name: "Receitas Fixas" }));

    await waitFor(() =>
      expect(screen.getByText("Nenhum histórico de versões encontrado.")).toBeInTheDocument(),
    );
  });
});
