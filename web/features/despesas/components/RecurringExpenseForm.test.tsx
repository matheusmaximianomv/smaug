import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { RecurringExpenseForm } from "./RecurringExpenseForm";

const CATEGORIES = [makeCategoryWithCount({ id: "cat-1", name: "Moradia" })];

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof RecurringExpenseForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <RecurringExpenseForm categories={CATEGORIES} onSave={onSave} onClose={onClose} {...props} />,
  );
  return { onSave, onClose };
}

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Criar despesa recorrente" }));

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Descrição"), "Aluguel");
  await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "2200");
  await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-1");
}

describe("RecurringExpenseForm: validações", () => {
  it("exige a descrição", async () => {
    const { onSave } = renderForm();

    await submit();

    expect(screen.getByText("Descrição obrigatória.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "0");
    await submit();

    expect(screen.getByText("Valor inválido.")).toBeInTheDocument();
  });

  it("exige a categoria", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "2200");
    await submit();

    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument();
  });

  it("bloqueia início em competência passada", async () => {
    renderForm();

    await fillValid();
    await userEvent.selectOptions(screen.getByLabelText("Início da vigência — mês"), "8");
    await submit();

    expect(screen.getByText("Início não pode ser em competência passada.")).toBeInTheDocument();
  });

  it("rejeita término anterior ao início", async () => {
    renderForm();

    await fillValid();
    await userEvent.click(screen.getByLabelText("Definir data de término"));
    await userEvent.selectOptions(screen.getByLabelText("Início da vigência — mês"), "11");
    await userEvent.selectOptions(screen.getByLabelText("Término — mês"), "10");
    await submit();

    expect(screen.getByText("Término não pode ser anterior ao início.")).toBeInTheDocument();
  });

  it("aceita término igual ao início", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await userEvent.click(screen.getByLabelText("Definir data de término"));
    await submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endYear: 2026, endMonth: 9 }));
  });
});

describe("RecurringExpenseForm: término opcional", () => {
  it("o checkbox revela o segundo MonthYearSelect", async () => {
    renderForm();

    expect(screen.queryByLabelText("Término — mês")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Definir data de término"));

    expect(screen.getByLabelText("Término — mês")).toBeInTheDocument();
  });

  it("envia endYear e endMonth nulos sem término", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      description: "Aluguel",
      amount: 2200,
      categoryId: "cat-1",
      startYear: 2026,
      startMonth: 9,
      endYear: null,
      endMonth: null,
    });
  });

  it("envia o término escolhido", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await userEvent.click(screen.getByLabelText("Definir data de término"));
    await userEvent.selectOptions(screen.getByLabelText("Término — ano"), "2027");
    await submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endYear: 2027, endMonth: 9 }));
  });
});

describe("RecurringExpenseForm: comum", () => {
  it("apara a descrição e aceita vírgula decimal", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "  Aluguel  ");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "2200,75");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-1");
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Aluguel", amount: 2200.75 }),
    );
  });

  it("lista as categorias recebidas", () => {
    renderForm();

    expect(screen.getByRole("option", { name: "Moradia" })).toBeInTheDocument();
  });

  it("Cancelar chama onClose", async () => {
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Criar despesa recorrente" })).toBeDisabled();
  });
});
