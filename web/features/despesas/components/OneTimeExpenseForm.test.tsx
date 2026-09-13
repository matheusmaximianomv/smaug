import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeCategoryWithCount, makeOneTimeExpense } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { OneTimeExpenseForm } from "./OneTimeExpenseForm";

const CATEGORIES = [
  makeCategoryWithCount({ id: "cat-1", name: "Moradia" }),
  makeCategoryWithCount({ id: "cat-2", name: "Alimentação" }),
];

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof OneTimeExpenseForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <OneTimeExpenseForm categories={CATEGORIES} onSave={onSave} onClose={onClose} {...props} />,
  );
  return { onSave, onClose };
}

const submitCreate = () =>
  userEvent.click(screen.getByRole("button", { name: "Adicionar despesa" }));

describe("OneTimeExpenseForm: criação", () => {
  it('usa o rótulo "Adicionar despesa"', () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Adicionar despesa" })).toBeInTheDocument();
  });

  it("exige a descrição", async () => {
    const { onSave } = renderForm();

    await submitCreate();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejeita descrição acima de 255 caracteres", async () => {
    renderForm();

    // paste() em vez de type(): digitar 256 caracteres dispara 256 eventos e
    // estoura o timeout de 5 s sob instrumentação de cobertura.
    await userEvent.click(screen.getByLabelText("Descrição"));
    await userEvent.paste("x".repeat(256));
    await submitCreate();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Supermercado");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "-5");
    await submitCreate();

    expect(screen.getByText("Valor inválido.")).toBeInTheDocument();
  });

  it("exige a categoria", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Supermercado");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "450");
    await submitCreate();

    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument();
  });

  it("bloqueia competência passada na criação", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Supermercado");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "450");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-1");
    await userEvent.selectOptions(screen.getByLabelText("Competência — mês"), "8");
    await submitCreate();

    expect(
      screen.getByText("Não é permitido criar despesas em competências passadas."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("envia o payload com a descrição sem espaços nas pontas", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "  Supermercado  ");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "450,90");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-2");
    await submitCreate();

    expect(onSave).toHaveBeenCalledWith({
      description: "Supermercado",
      amount: 450.9,
      categoryId: "cat-2",
      competenceYear: 2026,
      competenceMonth: 9,
    });
  });
});

describe("OneTimeExpenseForm: edição", () => {
  const initial = makeOneTimeExpense({
    description: "Supermercado",
    amount: 450,
    competenceYear: 2026,
    competenceMonth: 3,
  });

  it('usa o rótulo "Salvar" e preenche os campos', () => {
    renderForm({ initial });

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Supermercado");
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("450");
    expect(screen.getByLabelText("Competência — mês")).toHaveValue("3");
  });

  it("PULA a checagem de competência passada na edição", async () => {
    const { onSave } = renderForm({ initial });

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(
      screen.queryByText("Não é permitido criar despesas em competências passadas."),
    ).not.toBeInTheDocument();
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ competenceYear: 2026, competenceMonth: 3 }),
    );
  });

  it("continua validando descrição e valor na edição", async () => {
    const { onSave } = renderForm({ initial });

    await userEvent.clear(screen.getByLabelText("Descrição"));
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("OneTimeExpenseForm: comum", () => {
  it("lista as categorias recebidas", () => {
    renderForm();

    expect(screen.getByRole("option", { name: "Moradia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Alimentação" })).toBeInTheDocument();
  });

  it("Cancelar chama onClose", async () => {
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Adicionar despesa" })).toBeDisabled();
  });
});
