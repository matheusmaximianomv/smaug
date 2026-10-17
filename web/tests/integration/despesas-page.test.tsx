import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DespesasPage from "@/app/(app)/despesas/page";
import { getUserId } from "@/infra/session";
import { renderWithProviders } from "../render";
import { db, mockApiError, mockNetworkError, seedDb } from "../msw";
import {
  fixtureUuid,
  makeCategoryWithCount,
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../fixtures";
import { loginAs } from "../session";
import { recordRequests } from "../requests";
import { freezeDateOnly, unfreezeTime } from "../time";

const MORADIA = makeCategoryWithCount({ name: "Moradia" });
const LEDGER_KEY = "smaug:competencia-lancamentos";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T12:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
  sessionStorage.clear();
});

function renderPage() {
  return renderWithProviders(<DespesasPage />, { pathname: "/despesas", withToasts: true });
}

const ficha = (name: string) => screen.getByRole("dialog", { name });
const settled = () => screen.findByRole("heading", { name: "Setembro 2026" });

function recurring(o: { description?: string; amount?: number; endMonth?: number | null } = {}) {
  const version = makeRecurringExpenseVersion({
    category: MORADIA,
    description: o.description ?? "Aluguel",
    amount: o.amount ?? 1500,
    effectiveYear: 2026,
    effectiveMonth: 1,
  });
  return makeRecurringExpense({
    startYear: 2026,
    startMonth: 1,
    endYear: o.endMonth ? 2026 : null,
    endMonth: o.endMonth ?? null,
    currentVersion: version,
    versions: [version],
  });
}

describe("página de despesas: estrutura e navegação", () => {
  it("abre no mês corrente com um único botão de criação e sem abas", async () => {
    renderPage();
    await settled();

    expect(screen.getByRole("heading", { name: "Despesas", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Avulsas, parceladas e recorrentes de cada mês")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Nova despesa/ })).toHaveLength(1);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Mês atual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Set/, pressed: true })).toBeInTheDocument();
  });

  it("navega pela faixa e volta ao mês atual", async () => {
    renderPage();
    await settled();

    await userEvent.click(
      within(screen.getByRole("group", { name: "Meses do ano" })).getByRole("button", {
        name: /^Nov/,
      }),
    );
    expect(await screen.findByRole("heading", { name: "Novembro 2026" })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(LEDGER_KEY)!)).toEqual({ year: 2026, month: 11 });

    await userEvent.click(screen.getByRole("button", { name: "Voltar para o mês atual" }));
    expect(await screen.findByRole("heading", { name: "Setembro 2026" })).toBeInTheDocument();
  });

  it("troca o ano da faixa ao passar de dezembro pelas setas", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 12 }));
    seedDb({
      oneTimeExpenses: [
        makeOneTimeExpense({ competenceYear: 2027, competenceMonth: 3, amount: 3420 }),
      ],
    });
    renderPage();
    await screen.findByRole("heading", { name: "Dezembro 2026" });

    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(await screen.findByRole("heading", { name: "Janeiro 2027" })).toBeInTheDocument();
    expect(await screen.findByText("3.420")).toBeInTheDocument();
  });
});

describe("página de despesas: resumo e lista", () => {
  it('mostra "Total previsto", a legenda com tipos zerados e os grupos não vazios', async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [
        makeOneTimeExpense({ description: "Farmácia", amount: 50, category: MORADIA }),
      ],
      recurringExpenses: [recurring()],
    });
    renderPage();

    const summary = await screen.findByRole("region", { name: "Resumo do mês" });
    expect(within(summary).getByText("Total previsto")).toBeInTheDocument();
    expect(within(summary).getByText("2 lançamentos")).toBeInTheDocument();
    expect(within(summary).getByText(/Parceladas/).parentElement).toHaveTextContent("R$ 0,00");
    expect(screen.getByRole("region", { name: "Recorrentes" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Avulsas" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Parceladas" })).not.toBeInTheDocument();
    expect(screen.getByText("Moradia · desde Jan/26 · sem término")).toBeInTheDocument();
  });

  it('usa "Total gasto" em mês passado', async () => {
    seedDb({ oneTimeExpenses: [makeOneTimeExpense({ competenceMonth: 8 })] });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    expect(await screen.findByText("Total gasto")).toBeInTheDocument();
  });
});

describe("página de despesas: estado vazio e erro", () => {
  it("em mês passado vazio explica a regra e não oferece botão", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 2 }));
    renderPage();

    expect(await screen.findByText("Nenhuma despesa em fevereiro 2026")).toBeInTheDocument();
    expect(
      screen.getByText(/Competências passadas não aceitam novos lançamentos/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar despesa" })).not.toBeInTheDocument();
  });

  it("em mês futuro vazio oferece adicionar, que abre o assistente", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 12 }));
    renderPage();

    expect(
      await screen.findByText("Recorrentes e parcelas futuras aparecem aqui automaticamente."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar despesa" }));

    expect(screen.getByRole("dialog", { name: "Nova despesa" })).toBeInTheDocument();
  });

  it("em falha de rede mostra a mensagem offline, repete e mantém a sessão", async () => {
    loginAs(fixtureUuid(1));
    mockNetworkError("get", "/expenses");
    renderPage();

    expect(
      await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão."),
    ).toBeInTheDocument();
    expect(getUserId()).toBe(fixtureUuid(1));

    mockApiError("get", "/expenses", 500, { error: "EXPENSE_CATEGORY_NOT_FOUND" });
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Categoria não encontrada.")).toBeInTheDocument();
  });
});

describe("página de despesas: assistente", () => {
  it("cria uma avulsa: toast, grupo e faixa atualizados", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Farmácia");
    await userEvent.type(screen.getByLabelText(/^Valor/), "1.234,50");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar despesa" }));

    expect(await screen.findByText("Despesa adicionada")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(
      within(screen.getByRole("region", { name: "Avulsas" })).getByText("Farmácia"),
    ).toBeInTheDocument();
    expect(await screen.findByText("1.234")).toBeInTheDocument();
    expect(db.oneTimeExpenses[0]).toMatchObject({ amount: 1234.5, competenceMonth: 9 });
  });

  it("mantém o assistente aberto com os dados quando o servidor recusa", async () => {
    seedDb({ categories: [MORADIA] });
    mockApiError("post", "/expenses/one-time", 409, { error: "PAST_COMPETENCE" });
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Farmácia");
    await userEvent.type(screen.getByLabelText(/^Valor/), "50");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar despesa" }));

    expect(
      await screen.findByText("Não é possível alterar lançamentos de competências passadas."),
    ).toBeInTheDocument();
    expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nova despesa" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByLabelText("Descrição")).toHaveValue("Farmácia");
  });

  it("edita uma avulsa futura pela Ficha", async () => {
    const expense = makeOneTimeExpense({
      description: "Farmácia",
      amount: 50,
      category: MORADIA,
      competenceMonth: 10,
    });
    seedDb({ categories: [MORADIA], oneTimeExpenses: [expense] });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 10 }));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Farmácia/ }));
    await userEvent.click(within(ficha("Farmácia")).getByRole("button", { name: "Editar" }));
    const amount = screen.getByLabelText(/^Valor/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "75");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText("Despesa atualizada")).toBeInTheDocument();
    expect(db.oneTimeExpenses[0].amount).toBe(75);
  });
});

describe("página de despesas: Ficha de avulsa", () => {
  it("não oferece Editar nem Remover em avulsa de mês passado", async () => {
    seedDb({
      oneTimeExpenses: [
        makeOneTimeExpense({ description: "Farmácia", competenceMonth: 8, category: MORADIA }),
      ],
    });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Farmácia/ }));

    expect(within(ficha("Farmácia")).getByText("Realizada")).toBeInTheDocument();
    expect(within(ficha("Farmácia")).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(ficha("Farmácia")).queryByRole("button", { name: "Remover" })).toBeNull();
    expect(
      within(ficha("Farmácia")).getByText("Competências passadas não podem ser alteradas."),
    ).toBeInTheDocument();
  });

  it("Escape fecha só a confirmação; a remoção recusada mantém a Ficha com a mensagem pt-BR", async () => {
    const expense = makeOneTimeExpense({ description: "Farmácia", category: MORADIA });
    seedDb({ oneTimeExpenses: [expense] });
    mockApiError("delete", `/expenses/one-time/${expense.id}`, 409, { error: "PAST_COMPETENCE" });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Farmácia/ }));
    await userEvent.click(within(ficha("Farmácia")).getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("dialog", { name: "Remover despesa?" })).toHaveTextContent(
      'Excluir a despesa "Farmácia"?',
    );

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Remover despesa?" })).not.toBeInTheDocument();
    expect(await screen.findByRole("dialog", { name: "Farmácia" })).toBeInTheDocument();

    await userEvent.click(within(ficha("Farmácia")).getByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover despesa?" })).getByRole("button", {
        name: "Remover",
      }),
    );

    expect(
      await screen.findByText("Não é possível alterar lançamentos de competências passadas."),
    ).toBeInTheDocument();
    // A confirmação continua por cima (o Radix marca a Ficha com aria-hidden), e a Ficha segue aberta.
    const [fichaDialog, confirmDialog] = screen.getAllByRole("dialog", { hidden: true });
    expect(fichaDialog).toHaveTextContent("Avulsa: acontece uma única vez");
    expect(confirmDialog).toHaveTextContent("Remover despesa?");
  });

  it("remove a avulsa e fecha a Ficha", async () => {
    seedDb({
      oneTimeExpenses: [makeOneTimeExpense({ description: "Farmácia", category: MORADIA })],
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Farmácia/ }));
    await userEvent.click(within(ficha("Farmácia")).getByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover despesa?" })).getByRole("button", {
        name: "Remover",
      }),
    );

    expect(await screen.findByText("Despesa removida")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Nenhuma despesa em setembro 2026")).toBeInTheDocument();
  });
});

describe("página de despesas: Ficha de parcelada", () => {
  it("com parcela paga oferece Encerrar parcelamento, não Remover, e encerra", async () => {
    seedDb({
      installmentExpenses: [
        makeInstallmentExpense({
          description: "Notebook",
          category: MORADIA,
          totalAmount: 100,
          startYear: 2026,
          startMonth: 8,
        }),
      ],
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Notebook/ }));
    const dialog = await screen.findByRole("dialog", { name: "Notebook" });
    await within(dialog).findByText("Parcela atual");

    expect(within(dialog).getAllByText("2/3")).toHaveLength(2);
    expect(within(dialog).getByText("R$ 66,66")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Remover parcelamento" })).toBeNull();
    expect(
      within(dialog).getByText(/Parcelamentos com parcelas já pagas não podem ser removidos/),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar parcelamento" }));
    const confirm = screen.getByRole("dialog", { name: "Encerrar parcelamento?" });
    expect(confirm).toHaveTextContent(
      'As parcelas futuras de "Notebook" serão removidas. As parcelas já pagas continuam no histórico.',
    );
    await userEvent.click(within(confirm).getByRole("button", { name: "Encerrar" }));

    expect(await screen.findByText("Parcelamento encerrado")).toBeInTheDocument();
    await waitFor(() =>
      expect(within(ficha("Notebook")).getAllByRole("listitem", { hidden: true })).toBeTruthy(),
    );
    expect(db.installmentExpenses[0].installments).toHaveLength(2);
  });

  it("sem parcela paga oferece Remover parcelamento", async () => {
    seedDb({
      installmentExpenses: [makeInstallmentExpense({ description: "Curso", category: MORADIA })],
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Curso/ }));
    const dialog = await screen.findByRole("dialog", { name: "Curso" });
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Remover parcelamento" }),
    );

    expect(screen.getByRole("dialog", { name: "Remover parcelamento?" })).toHaveTextContent(
      'Excluir todo o parcelamento "Curso"? Todas as parcelas serão removidas.',
    );
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover parcelamento?" })).getByRole("button", {
        name: "Remover",
      }),
    );
    expect(await screen.findByText("Parcelamento removido")).toBeInTheDocument();
  });

  it("mostra o erro pt-BR da remoção recusada", async () => {
    const expense = makeInstallmentExpense({ description: "Curso", category: MORADIA });
    seedDb({ installmentExpenses: [expense] });
    mockApiError("delete", `/expenses/installment/${expense.id}`, 409, {
      error: "INSTALLMENT_HAS_PAST_COMPETENCE",
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Curso/ }));
    await userEvent.click(
      await within(ficha("Curso")).findByRole("button", { name: "Remover parcelamento" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover parcelamento?" })).getByRole("button", {
        name: "Remover",
      }),
    );

    expect(
      await screen.findByText(
        "Este parcelamento já possui parcelas em meses passados e não pode ser excluído.",
      ),
    ).toBeInTheDocument();
  });

  it("mostra o erro pt-BR do encerramento recusado", async () => {
    const expense = makeInstallmentExpense({
      description: "Notebook",
      category: MORADIA,
      startYear: 2026,
      startMonth: 8,
    });
    seedDb({ installmentExpenses: [expense] });
    mockApiError("post", `/expenses/installment/${expense.id}/terminate`, 409, {
      error: "NO_FUTURE_INSTALLMENTS",
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Notebook/ }));
    await userEvent.click(
      await within(ficha("Notebook")).findByRole("button", { name: "Encerrar parcelamento" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Encerrar parcelamento?" })).getByRole("button", {
        name: "Encerrar",
      }),
    );

    expect(await screen.findByText("Não há parcelas futuras para encerrar.")).toBeInTheDocument();
  });

  it("na última parcela só oferece Fechar", async () => {
    seedDb({
      installmentExpenses: [
        makeInstallmentExpense({
          description: "TV",
          category: MORADIA,
          startYear: 2026,
          startMonth: 7,
        }),
      ],
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /TV/ }));
    const dialog = await screen.findByRole("dialog", { name: "TV" });
    await within(dialog).findByText("Parcela atual");

    expect(within(dialog).queryByRole("button", { name: /parcelamento/ })).toBeNull();
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Fechar" }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("mostra o erro de leitura do detalhe com Tentar novamente", async () => {
    const expense = makeInstallmentExpense({ description: "TV", category: MORADIA });
    seedDb({ installmentExpenses: [expense] });
    mockApiError("get", `/expenses/installment/${expense.id}`, 404, {
      error: "INSTALLMENT_EXPENSE_NOT_FOUND",
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /TV/ }));

    expect(
      await within(ficha("TV")).findByText("Parcelamento não encontrado."),
    ).toBeInTheDocument();
    expect(
      within(ficha("TV")).getByRole("button", { name: "Tentar novamente" }),
    ).toBeInTheDocument();
  });
});

describe("página de despesas: Ficha de recorrente", () => {
  it("encerrada só consulta: Remover e Fechar, com a nota", async () => {
    seedDb({ recurringExpenses: [recurring({ endMonth: 8 })] });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });

    expect(
      await within(dialog).findByText("Encerrada em Ago/26 — apenas consulta do histórico."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Nova versão" })).toBeNull();
    expect(within(dialog).queryByRole("button", { name: "Encerrar" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Remover" })).toBeInTheDocument();
  });

  it("cria nova versão e volta à visualização; recusa mostra a mensagem pt-BR", async () => {
    const expense = recurring();
    seedDb({ categories: [MORADIA], recurringExpenses: [expense] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Nova versão" }));
    expect(within(dialog).getByLabelText(/Vigência a partir de/)).toHaveDisplayValue(
      "Outubro 2026",
    );

    mockApiError("patch", `/expenses/recurring/${expense.id}`, 409, { error: "VERSION_CONFLICT" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));
    expect(
      await screen.findByText("Já existe uma versão vigente a partir deste mês."),
    ).toBeInTheDocument();
    expect(within(ficha("Aluguel")).getByText("› Nova versão")).toBeInTheDocument();
  });

  it("valida a nova versão com as mensagens do PRD", async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [recurring()] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Nova versão" }));
    await userEvent.clear(within(dialog).getByLabelText("Nova descrição"));
    await userEvent.clear(within(dialog).getByLabelText(/Novo valor mensal/));
    await userEvent.selectOptions(within(dialog).getByLabelText("Categoria"), "");
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));

    expect(within(dialog).getByText("Obrigatório")).toBeInTheDocument();
    expect(within(dialog).getByText("Valor inválido")).toBeInTheDocument();
    expect(within(dialog).getByText("Selecione uma categoria")).toBeInTheDocument();
  });

  it("encerra a recorrente e mostra o toast", async () => {
    const expense = recurring();
    seedDb({ recurringExpenses: [expense] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Encerrar" }));
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/Mês de encerramento/),
      "Dezembro 2026",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar despesa" }));

    expect(await screen.findByText("Despesa encerrada")).toBeInTheDocument();
    expect(db.recurringExpenses[0]).toMatchObject({ endYear: 2026, endMonth: 12 });
  });

  it("mostra o erro pt-BR do encerramento recusado", async () => {
    const expense = recurring();
    seedDb({ recurringExpenses: [expense] });
    mockApiError("patch", `/expenses/recurring/${expense.id}/terminate`, 409, {
      error: "RECURRING_EXPENSE_ALREADY_EXPIRED",
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Encerrar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar despesa" }));

    expect(
      await screen.findByText("Esta despesa recorrente já está encerrada."),
    ).toBeInTheDocument();
  });

  it("remove a recorrente e fecha a Ficha", async () => {
    seedDb({ recurringExpenses: [recurring()] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    const dialog = await screen.findByRole("dialog", { name: "Aluguel" });
    await userEvent.click(await within(dialog).findByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover despesa?" })).getByRole("button", {
        name: "Remover",
      }),
    );

    expect(await screen.findByText("Despesa removida")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("mostra o erro de leitura da série", async () => {
    const expense = recurring();
    seedDb({ recurringExpenses: [expense] });
    mockApiError("get", `/expenses/recurring/${expense.id}`, 404, {
      error: "RECURRING_EXPENSE_NOT_FOUND",
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));

    expect(
      await within(ficha("Aluguel")).findByText("Despesa recorrente não encontrada."),
    ).toBeInTheDocument();
  });
});

describe("página de despesas: interações restantes", () => {
  it("volta um mês pela seta", async () => {
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(await screen.findByRole("heading", { name: "Agosto 2026" })).toBeInTheDocument();
  });

  it("cancela as confirmações da parcelada sem fechar a Ficha", async () => {
    seedDb({
      installmentExpenses: [
        makeInstallmentExpense({ description: "Curso", category: MORADIA }),
        makeInstallmentExpense({
          description: "Notebook",
          category: MORADIA,
          startYear: 2026,
          startMonth: 8,
        }),
      ],
    });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Curso/ }));
    await userEvent.click(
      await within(ficha("Curso")).findByRole("button", { name: "Remover parcelamento" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover parcelamento?" })).getByRole("button", {
        name: "Cancelar",
      }),
    );
    expect(await screen.findByRole("dialog", { name: "Curso" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Notebook/ }));
    await userEvent.click(
      await within(ficha("Notebook")).findByRole("button", { name: "Encerrar parcelamento" }),
    );
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Encerrar parcelamento?" })).getByRole("button", {
        name: "Cancelar",
      }),
    );
    expect(await screen.findByRole("dialog", { name: "Notebook" })).toBeInTheDocument();
  });

  it("repete a leitura do detalhe da parcelada e da recorrente", async () => {
    const installment = makeInstallmentExpense({ description: "TV", category: MORADIA });
    const expense = recurring();
    seedDb({ installmentExpenses: [installment], recurringExpenses: [expense] });
    mockApiError("get", `/expenses/installment/${installment.id}`, 500, {});
    mockApiError("get", `/expenses/recurring/${expense.id}`, 500, {});
    const calls = recordRequests();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /TV/ }));
    await userEvent.click(
      await within(ficha("TV")).findByRole("button", { name: "Tentar novamente" }),
    );
    await waitFor(() =>
      expect(
        calls.filter((c) => c.path === `/expenses/installment/${installment.id}`),
      ).toHaveLength(2),
    );
    await userEvent.keyboard("{Escape}");

    await userEvent.click(await screen.findByRole("button", { name: /Aluguel/ }));
    await userEvent.click(
      await within(ficha("Aluguel")).findByRole("button", { name: "Tentar novamente" }),
    );
    await waitFor(() =>
      expect(calls.filter((c) => c.path === `/expenses/recurring/${expense.id}`)).toHaveLength(2),
    );
  });

  it("cria nova versão com categoria e vigência escolhidas", async () => {
    const lazer = makeCategoryWithCount({ name: "Lazer" });
    const version = makeRecurringExpenseVersion({
      description: "Academia",
      amount: 100,
      effectiveYear: 2026,
      effectiveMonth: 1,
    });
    const expense = makeRecurringExpense({
      startYear: 2026,
      startMonth: 1,
      currentVersion: { ...version, category: undefined as never },
      versions: [{ ...version, category: undefined as never }],
    });
    seedDb({ categories: [MORADIA, lazer], recurringExpenses: [expense] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Academia/ }));
    const dialog = await screen.findByRole("dialog", { name: "Academia" });
    expect(await within(dialog).findByText("Jan/26 → em aberto")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nova versão" }));
    await userEvent.selectOptions(within(dialog).getByLabelText("Categoria"), "Lazer");
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/Vigência a partir de/),
      "Dezembro 2026",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));

    expect(await screen.findByText("Nova versão criada")).toBeInTheDocument();
    expect(db.recurringExpenses[0].versions?.at(-1)).toMatchObject({
      categoryId: lazer.id,
      effectiveMonth: 12,
    });
  });
});
