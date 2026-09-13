import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { RecurringExpenseVersionForm } from "./RecurringExpenseVersionForm";

const CATEGORIES = [
  makeCategoryWithCount({ id: "cat-1", name: "Moradia" }),
  makeCategoryWithCount({ id: "cat-2", name: "Serviços" }),
];

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof RecurringExpenseVersionForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <RecurringExpenseVersionForm
      categories={CATEGORIES}
      onSave={onSave}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSave, onClose };
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Criar nova versão" }));

describe("RecurringExpenseVersionForm", () => {
  it("explica que o histórico anterior é preservado", () => {
    renderForm();

    expect(
      screen.getByText(
        /A alteração valerá a partir do mês selecionado. O histórico anterior é preservado./,
      ),
    ).toBeInTheDocument();
  });

  it("exige a nova descrição", async () => {
    const { onSave } = renderForm();

    await submit();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "0");
    await submit();

    expect(screen.getByText("Valor inválido. Use número positivo.")).toBeInTheDocument();
  });

  it("exige a categoria", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "2500");
    await submit();

    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument();
  });

  it("bloqueia vigência em mês passado", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Aluguel");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "2500");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-1");
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "1");
    await submit();

    expect(screen.getByText("A vigência não pode começar em mês passado.")).toBeInTheDocument();
  });

  it("lista as categorias recebidas no Select", () => {
    renderForm();

    expect(screen.getByRole("option", { name: "Moradia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Serviços" })).toBeInTheDocument();
  });

  it("envia o payload completo", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "  Aluguel  ");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "2500,50");
    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-2");
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "11");
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      description: "Aluguel",
      amount: 2500.5,
      categoryId: "cat-2",
      effectiveYear: 2026,
      effectiveMonth: 11,
    });
  });

  it("Cancelar chama onClose", async () => {
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Criar nova versão" })).toBeDisabled();
  });
});
