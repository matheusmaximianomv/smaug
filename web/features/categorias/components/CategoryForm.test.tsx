import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CategoryForm } from "./CategoryForm";

function renderForm(props: Partial<React.ComponentProps<typeof CategoryForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<CategoryForm onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose };
}

describe("CategoryForm", () => {
  it('rotula o campo como "Nome da categoria"', () => {
    renderForm();

    expect(screen.getByLabelText("Nome da categoria")).toBeInTheDocument();
  });

  it('usa o rótulo "Criar categoria" na criação', () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Criar categoria" })).toBeInTheDocument();
  });

  it('usa o rótulo "Salvar" na edição e preenche o nome', () => {
    renderForm({ initial: { name: "Moradia" } });

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da categoria")).toHaveValue("Moradia");
  });

  it("envia o nome digitado", async () => {
    const { onSave } = renderForm();

    await userEvent.type(screen.getByLabelText("Nome da categoria"), "Alimentação");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({ name: "Alimentação" }, expect.anything()),
    );
  });

  it('exige o nome: "Nome obrigatório"', async () => {
    const { onSave } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    expect(await screen.findByText("Nome obrigatório")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('limita o nome a 100 caracteres: "Máximo 100 caracteres"', async () => {
    const { onSave } = renderForm();

    // paste() em vez de type(): digitar 101 caracteres dispara 101 eventos e
    // estoura o timeout de 5 s sob instrumentação de cobertura.
    await userEvent.click(screen.getByLabelText("Nome da categoria"));
    await userEvent.paste("x".repeat(101));
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    expect(await screen.findByText("Máximo 100 caracteres")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Cancelar chama onClose sem submeter", async () => {
    const { onClose, onSave } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("desabilita o botão de salvar enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Criar categoria" })).toBeDisabled();
  });
});
