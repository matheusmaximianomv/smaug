import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { FixedRevenueVersionForm } from "./FixedRevenueVersionForm";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof FixedRevenueVersionForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<FixedRevenueVersionForm onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose };
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Criar nova versão" }));

describe("FixedRevenueVersionForm", () => {
  it("explica que meses anteriores preservam o valor antigo", () => {
    renderForm();

    expect(
      screen.getByText(
        /A nova versão será aplicada a partir do mês selecionado. Meses anteriores preservam o valor antigo./,
      ),
    ).toBeInTheDocument();
  });

  it("exige a nova descrição", async () => {
    const { onSave } = renderForm();

    await submit();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejeita descrição acima de 255 caracteres", async () => {
    renderForm();

    // paste() em vez de type(): digitar 256 caracteres dispara 256 eventos e
    // estoura o timeout de 5 s sob instrumentação de cobertura.
    await userEvent.click(screen.getByLabelText("Nova descrição"));
    await userEvent.paste("x".repeat(256));
    await submit();

    expect(screen.getByText("Descrição obrigatória (máx. 255 caracteres).")).toBeInTheDocument();
  });

  it("exige valor positivo", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Salário");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "-1");
    await submit();

    expect(screen.getByText("Valor inválido. Use número positivo.")).toBeInTheDocument();
  });

  it("bloqueia vigência em mês passado", async () => {
    renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "Salário");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "9000");
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "8");
    await submit();

    expect(screen.getByText("A vigência não pode começar em mês passado.")).toBeInTheDocument();
  });

  it("envia o payload com a descrição aparada", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Nova descrição"), "  Salário  ");
    await userEvent.type(screen.getByLabelText("Novo valor (R$)"), "9000,25");
    await userEvent.selectOptions(screen.getByLabelText("Vigência a partir de — mês"), "10");
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      description: "Salário",
      amount: 9000.25,
      effectiveYear: 2026,
      effectiveMonth: 10,
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
