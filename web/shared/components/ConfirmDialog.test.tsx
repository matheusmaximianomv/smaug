import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";

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

describe("ConfirmDialog sobre outro modal", () => {
  it("mostra o ícone de lixeira na variante danger", () => {
    const { rerender } = render(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} />,
    );
    expect(screen.getByRole("dialog").querySelector("svg.lucide-trash2")).toBeNull();

    rerender(
      <ConfirmDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} message={MESSAGE} isDanger />,
    );
    expect(screen.getByRole("dialog").querySelector("svg.lucide-trash2")).not.toBeNull();
  });

  it("fica na camada acima do modal pai e Escape fecha só a confirmação", async () => {
    const closeParent = vi.fn();
    const closeConfirm = vi.fn();
    const ui = (confirmOpen: boolean) => (
      <>
        <Modal isOpen onClose={closeParent} title="Ficha">
          <p>Detalhe</p>
        </Modal>
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={closeConfirm}
          onConfirm={vi.fn()}
          title="Remover despesa?"
          message={MESSAGE}
          isDanger
        />
      </>
    );
    const { rerender } = render(ui(false));
    rerender(ui(true));

    expect(screen.getByRole("dialog", { name: "Remover despesa?" })).toHaveClass("z-[60]");

    await userEvent.keyboard("{Escape}");

    expect(closeConfirm).toHaveBeenCalledTimes(1);
    expect(closeParent).not.toHaveBeenCalled();
  });
});
