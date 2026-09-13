import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { FixedRevenueForm } from "./FixedRevenueForm";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof FixedRevenueForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<FixedRevenueForm onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose };
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Criar receita fixa" }));

async function fillValid() {
  await userEvent.type(screen.getByLabelText("Descrição"), "Salário");
  await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "8000");
}

describe("FixedRevenueForm: validações", () => {
  it("exige a descrição", async () => {
    const { onSave } = renderForm();

    await submit();

    expect(screen.getByText("Descrição obrigatória.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "Salário");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "0");
    await submit();

    expect(screen.getByText("Valor inválido.")).toBeInTheDocument();
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
    await userEvent.selectOptions(screen.getByLabelText("Término da vigência — mês"), "10");
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

describe("FixedRevenueForm: modalidade", () => {
  it("começa em ALTERABLE", () => {
    renderForm();

    expect(screen.getByLabelText("Modalidade")).toHaveValue("ALTERABLE");
  });

  it("oferece as duas modalidades", () => {
    renderForm();

    expect(
      screen.getByRole("option", { name: "Alterável – pode ser reajustada com histórico" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Inalterável – somente encerramento" }),
    ).toBeInTheDocument();
  });

  it("envia a modalidade escolhida", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await userEvent.selectOptions(screen.getByLabelText("Modalidade"), "UNALTERABLE");
    await submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ modality: "UNALTERABLE" }));
  });
});

describe("FixedRevenueForm: término opcional", () => {
  it("o segundo MonthYearSelect só aparece com o checkbox marcado", async () => {
    renderForm();

    expect(screen.queryByLabelText("Término da vigência — mês")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Definir data de término"));

    expect(screen.getByLabelText("Término da vigência — mês")).toBeInTheDocument();
  });

  it("envia endYear e endMonth nulos quando não há término", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      description: "Salário",
      amount: 8000,
      modality: "ALTERABLE",
      startYear: 2026,
      startMonth: 9,
      endYear: null,
      endMonth: null,
    });
  });

  it("envia o término escolhido quando o checkbox está marcado", async () => {
    const { onSave } = renderForm();

    await fillValid();
    await userEvent.click(screen.getByLabelText("Definir data de término"));
    await userEvent.selectOptions(screen.getByLabelText("Término da vigência — ano"), "2027");
    await submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endYear: 2027, endMonth: 9 }));
  });
});

describe("FixedRevenueForm: comum", () => {
  it("aceita vírgula como separador decimal e apara a descrição", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Descrição"), "  Salário  ");
    await userEvent.type(screen.getByLabelText("Valor mensal (R$)"), "8000,50");
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Salário", amount: 8000.5 }),
    );
  });

  it("Cancelar chama onClose", async () => {
    const { onClose } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Criar receita fixa" })).toBeDisabled();
  });
});
