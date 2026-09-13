import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DespesasPage from "@/app/(app)/despesas/page";
import { renderWithProviders } from "../render";
import { db, mockPending, seedDb } from "../msw";
import {
  makeCategoryWithCount,
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../fixtures";
import { freezeDateOnly, unfreezeTime } from "../time";

const MORADIA = makeCategoryWithCount({ name: "Moradia" });

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderPage() {
  return renderWithProviders(<DespesasPage />, { pathname: "/despesas" });
}

const tab = (name: RegExp | string) => screen.getByRole("tab", { name });
const dialog = () => screen.getByRole("dialog");

describe("página de despesas: abas", () => {
  it("mostra as três abas com suas contagens", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense()],
      installmentExpenses: [makeInstallmentExpense(), makeInstallmentExpense()],
      recurringExpenses: [makeRecurringExpense(), makeRecurringExpense(), makeRecurringExpense()],
    });
    renderPage();

    await waitFor(() => expect(within(tab(/Avulsas/)).getByText("1")).toBeInTheDocument());
    expect(within(tab(/Parceladas/)).getByText("2")).toBeInTheDocument();
    expect(within(tab(/Recorrentes/)).getByText("3")).toBeInTheDocument();
  });

  it.each([
    [/Avulsas/, "Nova despesa avulsa"],
    [/Parceladas/, "Novo parcelamento"],
    [/Recorrentes/, "Nova despesa recorrente"],
  ])("a aba %s usa o rótulo de botão %s", async (name, label) => {
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");

    await userEvent.click(tab(name));

    expect(screen.getByRole("button", { name: new RegExp(label) })).toBeInTheDocument();
  });

  it("cada aba tem o seu estado vazio", async () => {
    renderPage();

    expect(await screen.findByText("Nenhuma despesa avulsa cadastrada.")).toBeInTheDocument();

    await userEvent.click(tab(/Parceladas/));
    expect(screen.getByText("Nenhum parcelamento cadastrado.")).toBeInTheDocument();

    await userEvent.click(tab(/Recorrentes/));
    expect(screen.getByText("Nenhuma despesa recorrente cadastrada.")).toBeInTheDocument();
  });
});

describe("página de despesas: os três ConfirmDialog", () => {
  it('avulsa: "Excluir a despesa "X"?"', async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado" })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));

    expect(screen.getByText('Excluir a despesa "Supermercado"?')).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(db.oneTimeExpenses).toHaveLength(0));
  });

  it("parcelamento: avisa que todas as parcelas serão removidas", async () => {
    seedDb({ categories: [MORADIA], installmentExpenses: [makeInstallmentExpense()] });
    renderPage();
    await userEvent.click(tab(/Parceladas/));
    await screen.findByTestId("installment-card");

    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]);

    expect(
      screen.getByText("Excluir todo o parcelamento? Todas as parcelas serão removidas."),
    ).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(db.installmentExpenses).toHaveLength(0));
  });

  it('recorrente: "Excluir a despesa recorrente?"', async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));
    await screen.findByTestId("recurring-expense-card");

    const buttons = screen.getAllByRole("button");
    await userEvent.click(buttons[buttons.length - 1]);

    expect(screen.getByText("Excluir a despesa recorrente?")).toBeInTheDocument();

    await userEvent.click(within(dialog()).getByRole("button", { name: "Excluir" }));

    await waitFor(() => expect(db.recurringExpenses).toHaveLength(0));
  });
});

describe("página de despesas: catOptions vêm de useCategories", () => {
  it("o formulário de avulsa recebe as categorias carregadas", async () => {
    seedDb({ categories: [MORADIA, makeCategoryWithCount({ name: "Lazer" })] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa avulsa/ }));

    const select = screen.getByLabelText("Categoria");
    expect(within(select).getByRole("option", { name: "Moradia" })).toBeInTheDocument();
    expect(within(select).getByRole("option", { name: "Lazer" })).toBeInTheDocument();
  });

  it("o formulário de parcelamento recebe as mesmas categorias", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");

    await userEvent.click(tab(/Parceladas/));
    await userEvent.click(screen.getByRole("button", { name: /Novo parcelamento/ }));

    expect(
      within(screen.getByLabelText("Categoria")).getByRole("option", { name: "Moradia" }),
    ).toBeInTheDocument();
  });

  it("o formulário de recorrente recebe as mesmas categorias", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");

    await userEvent.click(tab(/Recorrentes/));
    await userEvent.click(screen.getByRole("button", { name: /Nova despesa recorrente/ }));

    expect(
      within(screen.getByLabelText("Categoria")).getByRole("option", { name: "Moradia" }),
    ).toBeInTheDocument();
  });
});

describe("página de despesas: avulsas", () => {
  it("ordena em ordem decrescente de competência", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [
        makeOneTimeExpense({ description: "Antiga", competenceYear: 2025, competenceMonth: 12 }),
        makeOneTimeExpense({ description: "Recente", competenceYear: 2026, competenceMonth: 11 }),
        makeOneTimeExpense({ description: "Meio", competenceYear: 2026, competenceMonth: 3 }),
      ],
    });
    renderPage();
    await screen.findByText("Recente");

    const descriptions = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("td")?.textContent);
    expect(descriptions).toEqual(["Recente", "Meio", "Antiga"]);
  });

  it("abre a edição preenchida a partir da linha", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado", amount: 450 })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));

    expect(within(dialog()).getByText("Editar despesa avulsa")).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Supermercado");
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("450");
  });
});

describe("página de despesas: parceladas e recorrentes", () => {
  it('"Ver parcelas" abre o modal com o cronograma', async () => {
    seedDb({
      categories: [MORADIA],
      installmentExpenses: [
        makeInstallmentExpense({
          description: "Notebook",
          installmentCount: 3,
          startYear: 2026,
          startMonth: 9,
        }),
      ],
    });
    renderPage();
    await userEvent.click(tab(/Parceladas/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver parcelas/ }));

    expect(within(dialog()).getByText("Parcelas — Notebook")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("Nov/26")).toBeInTheDocument();
  });

  it("encerra a despesa recorrente na competência escolhida", async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    expect(
      screen.getByText("A despesa recorrente será encerrada ao final do mês selecionado."),
    ).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Mês de encerramento — mês"), "11");
    await userEvent.click(screen.getByRole("button", { name: "Encerrar despesa" }));

    await waitFor(() => expect(db.recurringExpenses[0].endMonth).toBe(11));
  });

  it("o histórico da recorrente ordena as versões em ordem decrescente", async () => {
    const older = makeRecurringExpenseVersion({
      description: "Aluguel",
      effectiveYear: 2026,
      effectiveMonth: 1,
    });
    const newer = makeRecurringExpenseVersion({
      description: "Aluguel reajustado",
      effectiveYear: 2026,
      effectiveMonth: 10,
    });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [
        makeRecurringExpense({ currentVersion: newer, versions: [older, newer] }),
      ],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver histórico/ }));

    const labels = screen.getAllByText(/A partir de/).map((el) => el.textContent);
    expect(labels).toEqual(["A partir de Out/26", "A partir de Jan/26"]);
  });

  it('"Nova versão" da recorrente abre o formulário com categorias', async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));

    expect(within(dialog()).getByText("Nova versão da despesa")).toBeInTheDocument();
    expect(screen.getByLabelText("Nova descrição")).toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Categoria")).getByRole("option", { name: "Moradia" }),
    ).toBeInTheDocument();
  });
});

describe("página de despesas: criação e edição", () => {
  it("cria uma despesa avulsa e fecha o modal", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa avulsa/ }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Supermercado");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "450");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), MORADIA.id);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar despesa" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Supermercado")).toBeInTheDocument();
    expect(db.oneTimeExpenses).toHaveLength(1);
  });

  it("edita uma despesa avulsa existente", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado" })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.clear(screen.getByLabelText("Descrição"));
    await userEvent.type(screen.getByLabelText("Descrição"), "Feira");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByText("Feira")).toBeInTheDocument();
  });

  it("cria um parcelamento pela aba Parceladas", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");
    await userEvent.click(tab(/Parceladas/));

    await userEvent.click(screen.getByRole("button", { name: /Novo parcelamento/ }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Notebook");
    await userEvent.type(screen.getByLabelText("Valor total (R$)"), "3600");
    await userEvent.type(screen.getByLabelText("Nº de parcelas"), "12");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), MORADIA.id);
    await userEvent.click(screen.getByRole("button", { name: "Criar parcelamento" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByTestId("installment-card")).toHaveTextContent("Notebook");
  });

  it("cria uma despesa recorrente pela aba Recorrentes", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await screen.findByText("Nenhuma despesa avulsa cadastrada.");
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa recorrente/ }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "2200");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), MORADIA.id);
    await userEvent.click(screen.getByRole("button", { name: "Criar despesa recorrente" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(await screen.findByTestId("recurring-expense-card")).toHaveTextContent("Aluguel");
  });

  it("cria uma nova versão da despesa recorrente", async () => {
    const version = makeRecurringExpenseVersion({
      description: "Aluguel",
      categoryId: MORADIA.id,
      category: MORADIA,
      effectiveMonth: 9,
    });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [makeRecurringExpense({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));
    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Aluguel reajustado");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "2500");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), MORADIA.id);
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Criar nova versão" }));

    await waitFor(() => expect(db.recurringExpenses[0].versions).toHaveLength(2));
    expect(db.recurringExpenses[0].currentVersion.amount).toBe(2500);
  });
});

/**
 * Cancelar não estava coberto nem aqui nem no E2E. Nesta página são 8 modais e
 * 3 ConfirmDialogs — e `endMonth`/`endYear` são estado da PÁGINA, que vazava
 * entre aberturas antes da correção coberta abaixo.
 */
describe("página de despesas: cancelar", () => {
  it("fecha a criação de avulsa sem enviar nada", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Nova despesa avulsa/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.oneTimeExpenses).toHaveLength(0);
  });

  it("fecha a criação de avulsa pelo X", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Nova despesa avulsa/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a edição de avulsa sem alterar", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado", category: MORADIA })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.oneTimeExpenses[0].description).toBe("Supermercado");
  });

  it("não vaza a avulsa editada para a criação aberta em seguida", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado", category: MORADIA })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Nova despesa avulsa/ }));

    expect(within(dialog()).getByText("Nova despesa avulsa")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Supermercado, consulta médica...")).toHaveValue("");
  });

  it("fecha a criação de parcelamento sem enviar nada", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await userEvent.click(tab(/Parceladas/));

    await userEvent.click(await screen.findByRole("button", { name: /Novo parcelamento/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.installmentExpenses).toHaveLength(0);
  });

  it("fecha o modal de parcelas pelo Fechar", async () => {
    seedDb({
      categories: [MORADIA],
      installmentExpenses: [makeInstallmentExpense({ description: "Notebook", category: MORADIA })],
    });
    renderPage();
    await userEvent.click(tab(/Parceladas/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver parcelas/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a criação de recorrente sem enviar nada", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova despesa recorrente/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.recurringExpenses).toHaveLength(0);
  });

  it("fecha a criação de nova versão sem enviar nada", async () => {
    const version = makeRecurringExpenseVersion({ category: MORADIA });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [makeRecurringExpense({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.recurringExpenses[0].versions ?? []).toHaveLength(1);
  });

  it("fecha o encerramento sem encerrar", async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.recurringExpenses[0].endMonth).toBeNull();
  });

  /** Regressão: `endMonth`/`endYear` são estado da página e vazavam entre aberturas. */
  it("descarta o mês de encerramento escolhido ao cancelar", async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.selectOptions(screen.getByLabelText("Mês de encerramento — mês"), "12");
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Encerrar/ }));

    expect(screen.getByLabelText("Mês de encerramento — mês")).toHaveValue("9");
  });

  it("fecha o histórico de versões pelo Fechar", async () => {
    const version = makeRecurringExpenseVersion({ category: MORADIA });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [makeRecurringExpense({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver histórico/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it.each([
    ["Avulsas", "avulsa", () => db.oneTimeExpenses],
    ["Parceladas", "parcelamento", () => db.installmentExpenses],
    ["Recorrentes", "recorrente", () => db.recurringExpenses],
  ])("fecha o ConfirmDialog de exclusão de %s sem excluir", async (tabName, _kind, rows) => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ category: MORADIA })],
      installmentExpenses: [makeInstallmentExpense({ category: MORADIA })],
      recurringExpenses: [makeRecurringExpense()],
    });
    renderPage();
    await userEvent.click(tab(new RegExp(tabName)));

    const triggers = await screen.findAllByRole("button", { name: /Excluir|Excluir despesa/ });
    await userEvent.click(triggers[triggers.length - 1]);
    await userEvent.click(within(dialog()).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(rows()).toHaveLength(1);
  });
});

/**
 * O `onClose` do <Modal> (X, Escape, overlay) é uma função distinta do
 * "Cancelar" do formulário. Ambos fecham, por callbacks diferentes.
 */
describe("página de despesas: fechar pelo X e CTAs de estado vazio", () => {
  it.each([
    [/Parceladas/, "+ Criar parcelamento", "Novo parcelamento"],
    [/Recorrentes/, "+ Criar recorrente", "Nova despesa recorrente"],
  ])("o CTA %s abre o formulário correspondente", async (tabName, cta, title) => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await userEvent.click(tab(tabName));

    await userEvent.click(await screen.findByRole("button", { name: cta }));

    expect(within(dialog()).getByText(title)).toBeInTheDocument();
  });

  it("fecha a edição de avulsa pelo X", async () => {
    seedDb({
      categories: [MORADIA],
      oneTimeExpenses: [makeOneTimeExpense({ description: "Supermercado", category: MORADIA })],
    });
    renderPage();
    await screen.findByText("Supermercado");

    await userEvent.click(screen.getByRole("button", { name: "Editar" }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a criação de parcelamento pelo X", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await userEvent.click(tab(/Parceladas/));

    await userEvent.click(await screen.findByRole("button", { name: /Novo parcelamento/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a criação de recorrente pelo X", async () => {
    seedDb({ categories: [MORADIA] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova despesa recorrente/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha a nova versão pelo X", async () => {
    const version = makeRecurringExpenseVersion({ category: MORADIA });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [makeRecurringExpense({ currentVersion: version, versions: [version] })],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Nova versão/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("fecha o encerramento pelo X", async () => {
    seedDb({ categories: [MORADIA], recurringExpenses: [makeRecurringExpense()] });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Encerrar/ }));
    await userEvent.click(within(dialog()).getByRole("button", { name: "Fechar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(db.recurringExpenses[0].endMonth).toBeNull();
  });
});

describe("página de despesas: ramos de carregamento e dados parciais", () => {
  it.each([
    [/Parceladas/, "/expenses/installment"],
    [/Recorrentes/, "/expenses/recurring"],
  ])("mostra esqueletos na aba %s enquanto a consulta não responde", async (tabName, path) => {
    mockPending("get", path);
    seedDb({ categories: [MORADIA] });
    const { container } = renderPage();

    await userEvent.click(tab(tabName));

    await waitFor(() =>
      expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0),
    );
  });

  it('mostra "—" na coluna de categoria quando a despesa não tem categoria', async () => {
    const semCategoria = makeOneTimeExpense({ description: "Avulsa órfã", category: MORADIA });
    // A API pode devolver a despesa sem categoria embutida.
    delete (semCategoria as Partial<typeof semCategoria>).category;
    seedDb({ categories: [MORADIA], oneTimeExpenses: [semCategoria] });
    renderPage();

    const row = (await screen.findByText("Avulsa órfã")).closest("tr")!;
    expect(within(row).getByText("—")).toBeInTheDocument();
  });

  it("ordena as versões por ano decrescente no histórico", async () => {
    const antiga = makeRecurringExpenseVersion({
      description: "Aluguel 2025",
      category: MORADIA,
      effectiveYear: 2025,
      effectiveMonth: 11,
    });
    const nova = makeRecurringExpenseVersion({
      description: "Aluguel 2026",
      category: MORADIA,
      effectiveYear: 2026,
      effectiveMonth: 3,
    });
    seedDb({
      categories: [MORADIA],
      recurringExpenses: [makeRecurringExpense({ currentVersion: nova, versions: [antiga, nova] })],
    });
    renderPage();
    await userEvent.click(tab(/Recorrentes/));

    await userEvent.click(await screen.findByRole("button", { name: /Ver histórico/ }));

    const textos = within(dialog())
      .getAllByText(/A partir de/)
      .map((el) => el.textContent);
    expect(textos[0]).toContain("Mar/26");
    expect(textos[1]).toContain("Nov/25");
  });
});
