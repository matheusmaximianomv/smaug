import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeOneTimeRevenue } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { OneTimeRevenueForm } from "./OneTimeRevenueForm";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof OneTimeRevenueForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<OneTimeRevenueForm onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose };
}

const submitCreate = () =>
  userEvent.click(screen.getByRole("button", { name: "Adicionar receita" }));

describe("OneTimeRevenueForm: criação", () => {
  it('usa o rótulo "Adicionar receita"', () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Adicionar receita" })).toBeInTheDocument();
  });

  it("exige a descrição", async () => {
    const { onSave } = renderForm();

    await submitCreate();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Freelance");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "abc");
    await submitCreate();

    expect(screen.getByText("Valor inválido. Use número positivo.")).toBeInTheDocument();
  });

  it("bloqueia competência passada na criação", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Freelance");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "1500");
    await userEvent.selectOptions(screen.getByLabelText("Competência — ano"), "2025");
    await submitCreate();

    expect(
      screen.getByText("Não é permitido criar receitas em competências passadas."),
    ).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("envia o payload com a descrição sem espaços nas pontas", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "  Freelance  ");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "1500,50");
    await submitCreate();

    expect(onSave).toHaveBeenCalledWith({
      description: "Freelance",
      amount: 1500.5,
      competenceYear: 2026,
      competenceMonth: 9,
    });
  });

  it("aceita competência futura", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Freelance");
    await userEvent.type(screen.getByLabelText("Valor (R$)"), "1500");
    await userEvent.selectOptions(screen.getByLabelText("Competência — ano"), "2027");
    await submitCreate();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ competenceYear: 2027 }));
  });
});

describe("OneTimeRevenueForm: edição", () => {
  const initial = makeOneTimeRevenue({
    description: "Freelance",
    amount: 1500,
    competenceYear: 2026,
    competenceMonth: 2,
  });

  it('usa o rótulo "Salvar alterações" e preenche os campos', () => {
    renderForm({ initial });

    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descrição")).toHaveValue("Freelance");
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue("1500");
  });

  it("PULA a checagem de competência passada na edição", async () => {
    const { onSave } = renderForm({ initial });

    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ competenceYear: 2026, competenceMonth: 2 }),
    );
  });
});

describe("OneTimeRevenueForm: comum", () => {
  it("Cancelar chama onClose", async () => {
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Adicionar receita" })).toBeDisabled();
  });
});
