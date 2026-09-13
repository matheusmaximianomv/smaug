import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteWarningModal } from "./DeleteWarningModal";

describe("DeleteWarningModal", () => {
  it("não renderiza nada quando fechado", () => {
    render(<DeleteWarningModal isOpen={false} onClose={vi.fn()} categoryName="Moradia" />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('exibe o título "Não é possível excluir"', () => {
    render(<DeleteWarningModal isOpen onClose={vi.fn()} categoryName="Moradia" />);

    expect(screen.getByText("Não é possível excluir")).toBeInTheDocument();
  });

  it("cita o nome da categoria na explicação", () => {
    render(<DeleteWarningModal isOpen onClose={vi.fn()} categoryName="Moradia" />);

    expect(screen.getByText('"Moradia"')).toBeInTheDocument();
    expect(
      screen.getByText(/possui despesas vinculadas e não pode ser excluída/),
    ).toBeInTheDocument();
  });

  it("orienta a reclassificar as despesas antes", () => {
    render(<DeleteWarningModal isOpen onClose={vi.fn()} categoryName="Moradia" />);

    expect(
      screen.getByText(/Remova ou reclassifique as despesas antes de excluir a categoria/),
    ).toBeInTheDocument();
  });

  it('o botão "Entendido" chama onClose', async () => {
    const onClose = vi.fn();
    render(<DeleteWarningModal isOpen onClose={onClose} categoryName="Moradia" />);

    await userEvent.click(screen.getByRole("button", { name: "Entendido" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("não oferece opção de confirmar a exclusão", () => {
    render(<DeleteWarningModal isOpen onClose={vi.fn()} categoryName="Moradia" />);

    expect(screen.queryByRole("button", { name: "Confirmar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
  });
});
