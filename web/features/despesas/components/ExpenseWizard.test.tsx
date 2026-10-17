import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import { makeCategory, makeOneTimeExpense } from "../../../tests/fixtures";
import { spyOnToast } from "../../../tests/toast";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { ExpenseWizard } from "./ExpenseWizard";
import type { OneTimeExpenseMonthItem } from "../types";

const SEP = { year: 2026, month: 9 };
const MORADIA = makeCategory({ name: "Moradia" });
const ALIMENTACAO = makeCategory({ name: "Alimentação" });

beforeEach(() => {
  freezeDateOnly();
  spyOnToast();
});
afterEach(() => unfreezeTime());

function renderWizard(edit?: OneTimeExpenseMonthItem) {
  const onClose = vi.fn();
  renderWithProviders(
    <ExpenseWizard
      categories={[MORADIA, ALIMENTACAO]}
      initialCompetence={SEP}
      reference={SEP}
      edit={edit}
      onClose={onClose}
    />,
  );
  return { onClose };
}

const dialog = () => screen.getByRole("dialog");
const click = (name: string | RegExp) =>
  userEvent.click(within(dialog()).getByRole("button", { name }));

async function toDetails(kind: RegExp) {
  await userEvent.click(within(dialog()).getByRole("radio", { name: kind }));
  await click("Continuar");
}

async function fillCommon(amount: string) {
  await userEvent.type(screen.getByLabelText("Descrição"), "Notebook");
  await userEvent.type(screen.getByLabelText(/^Valor/), amount);
  await userEvent.selectOptions(screen.getByLabelText("Categoria"), "Moradia");
}

describe("ExpenseWizard: etapa Tipo", () => {
  it("pergunta o comportamento e pré-seleciona Avulsa", () => {
    renderWizard();

    expect(
      within(dialog()).getByText("Como essa despesa se comporta ao longo do tempo?"),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Avulsa/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("dialog", { name: "Nova despesa" })).toBeInTheDocument();
  });

  it("fecha com Escape sem gravar", async () => {
    const { onClose } = renderWizard();

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalled();
  });
});

describe("ExpenseWizard: etapa Detalhes", () => {
  it("mostra os rótulos da parcelada, categorias em ordem alfabética e o stepper", async () => {
    renderWizard();
    await toDetails(/Parcelada/);

    expect(screen.getByLabelText(/Valor total/)).toBeInTheDocument();
    expect(screen.getByLabelText(/1ª parcela em/)).toHaveDisplayValue("Setembro 2026");
    expect(screen.getByLabelText(/Nº de parcelas/)).toHaveValue("2");
    expect(
      within(screen.getByLabelText("Categoria"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Selecione...", "Alimentação", "Moradia"]);

    await userEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    expect(screen.getByLabelText(/Nº de parcelas/)).toHaveValue("3");
  });

  it('deixa a recorrente "Sem término" por padrão e libera o término ao desmarcar', async () => {
    renderWizard();
    await toDetails(/Recorrente/);

    const checkbox = screen.getByRole("checkbox", {
      name: "Sem data de término (encerre quando quiser)",
    });
    expect(checkbox).toBeChecked();
    expect(screen.getByLabelText("Termina em")).toBeDisabled();
    expect(screen.getByLabelText("Termina em")).toHaveValue("Sem término");

    await userEvent.click(checkbox);
    expect(screen.getByLabelText("Termina em")).toHaveDisplayValue("Agosto 2027");
    await userEvent.selectOptions(screen.getByLabelText(/Começa em/), "Dezembro 2026");
    await userEvent.selectOptions(screen.getByLabelText("Termina em"), "Janeiro 2027");
    expect(screen.getByLabelText("Termina em")).toHaveDisplayValue("Janeiro 2027");
  });

  it("recusa término antes do início", async () => {
    renderWizard();
    await toDetails(/Recorrente/);
    await fillCommon("100");
    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.selectOptions(screen.getByLabelText(/Começa em/), "Dezembro 2027");

    await click("Continuar");

    expect(await screen.findByText("Deve ser igual ou posterior ao início")).toBeInTheDocument();
  });

  it('valida ao continuar: "10,555" é "Valor inválido" e a Revisão não abre', async () => {
    renderWizard();
    await toDetails(/Avulsa/);
    await fillCommon("10,555");

    await click("Continuar");

    expect(await screen.findByText("Valor inválido")).toBeInTheDocument();
    expect(screen.queryByText("Meses afetados")).not.toBeInTheDocument();
  });

  it("volta à etapa Tipo pelo trocar e por Voltar, preservando os dados", async () => {
    renderWizard();
    await toDetails(/Avulsa/);
    await userEvent.type(screen.getByLabelText("Descrição"), "Farmácia");

    await click("trocar");
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    await click("Continuar");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Farmácia");

    await click("Voltar");
    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
  });
});

describe("ExpenseWizard: Revisão", () => {
  it("mostra 33,34/33,33/33,33 e a nota dos centavos para R$ 100,00 em 3×", async () => {
    renderWizard();
    await toDetails(/Parcelada/);
    await fillCommon("100");
    await userEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    await click("Continuar");

    const months = screen.getByRole("list", { name: "Meses afetados" });
    expect(
      within(months)
        .getAllByRole("listitem")
        .map((li) => li.textContent),
    ).toEqual(["Set/2633,34", "Out/2633,33", "Nov/2633,33"]);
    expect(screen.getByText(/3× R\$ 33,33/)).toBeInTheDocument();
    expect(
      screen.getByText("Os centavos que sobram da divisão entram na 1ª parcela (R$ 33,34)."),
    ).toBeInTheDocument();
    expect(within(dialog()).getByText("Moradia")).toBeInTheDocument();
  });

  it("não mostra a nota quando a divisão é exata", async () => {
    renderWizard();
    await toDetails(/Parcelada/);
    await fillCommon("100");
    await click("Continuar");

    expect(screen.queryByText(/centavos que sobram/)).not.toBeInTheDocument();
  });

  it("descreve a recorrente sem término e mostra continua…", async () => {
    renderWizard();
    await toDetails(/Recorrente/);
    await fillCommon("89,90");
    await click("Continuar");

    expect(screen.getByText(/desde Set\/26, sem término/)).toBeInTheDocument();
    expect(screen.getByText("continua…")).toBeInTheDocument();
  });

  it("descreve a recorrente com término pelo intervalo", async () => {
    renderWizard();
    await toDetails(/Recorrente/);
    await fillCommon("89,90");
    await userEvent.click(screen.getByRole("checkbox"));
    await click("Continuar");

    expect(screen.getByText(/Set\/26 a Ago\/27/)).toBeInTheDocument();
  });

  it("descreve a avulsa pelo mês por extenso e confirma", async () => {
    const { onClose } = renderWizard();
    await toDetails(/Avulsa/);
    await fillCommon("50");
    await click("Continuar");

    expect(screen.getByText(/em setembro 2026/)).toBeInTheDocument();
    await click("Confirmar despesa");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});

describe("ExpenseWizard: edição", () => {
  it('abre em Detalhes com "O tipo não muda" e salva com "Salvar alterações"', async () => {
    const expense = makeOneTimeExpense({ description: "Farmácia", amount: 50, category: MORADIA });
    seedDb({ oneTimeExpenses: [expense] });
    const { onClose } = renderWizard({
      ...expense,
      type: "ONE_TIME",
      category: { id: MORADIA.id, name: "Moradia" },
    });

    expect(screen.getByRole("dialog", { name: "Editar despesa" })).toBeInTheDocument();
    expect(screen.getByText("O tipo não muda depois do cadastro.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "trocar" })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Valor/)).toHaveValue("50,00");

    await click("Continuar");
    await click("Salvar alterações");

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('mostra "—" quando a categoria escolhida não está na lista', async () => {
    const expense = makeOneTimeExpense({ description: "Farmácia", amount: 50 });
    renderWizard({
      ...expense,
      type: "ONE_TIME",
      category: { id: "x", name: "x" },
      categoryId: "x",
    });

    await click("Continuar");

    expect(within(dialog()).getByText("—")).toBeInTheDocument();
  });
});
