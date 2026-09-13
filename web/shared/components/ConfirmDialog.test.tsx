import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";

const MESSAGE = 'Excluir a despesa "Supermercado"?';

describe("ConfirmDialog", () => {
  it("não renderiza nada quando fechado", () => {
    render(
      <ConfirmDialog isOpen={false} onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('usa os rótulos padrão "Confirmar ação", "Confirmar" e "Cancelar"', () => {
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} />);

    expect(screen.getByText("Confirmar ação")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("exibe a mensagem", () => {
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} />);

    expect(screen.getByText(MESSAGE)).toBeInTheDocument();
  });

  it("aceita título e rótulos custom", () => {
    render(
      <ConfirmDialog
        isOpen
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        message={MESSAGE}
        title="Excluir despesa"
        confirmLabel="Excluir"
        cancelLabel="Voltar"
      />,
    );

    expect(screen.getByText("Excluir despesa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeInTheDocument();
  });

  it("chama onConfirm ao confirmar", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} message={MESSAGE} />);

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("chama onClose ao cancelar", async () => {
    const onClose = vi.fn();
    render(<ConfirmDialog isOpen onClose={onClose} onConfirm={vi.fn()} message={MESSAGE} />);

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("usa a variante danger quando isDanger", () => {
    const { rerender } = render(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} />,
    );
    const padrao = screen.getByRole("button", { name: "Confirmar" }).className;

    rerender(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} isDanger />,
    );

    expect(screen.getByRole("button", { name: "Confirmar" }).className).not.toBe(padrao);
  });

  it("desabilita Cancelar e põe Confirmar em loading enquanto isLoading", () => {
    render(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} isLoading />,
    );

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  it("não dispara onConfirm enquanto isLoading", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={onConfirm} message={MESSAGE} isLoading />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
