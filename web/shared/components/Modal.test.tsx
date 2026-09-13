import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

/**
 * O Radix Dialog renderiza em portal, fora do `container` do RTL: toda consulta
 * aqui passa por `screen`.
 */
describe("Modal fechado", () => {
  it("não renderiza nada", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Conteúdo")).not.toBeInTheDocument();
  });
});

describe("Modal aberto", () => {
  it("renderiza o conteúdo em um dialog", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("exibe o título e o botão Fechar", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByText("Nova categoria")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });

  it("chama onClose ao clicar em Fechar", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chama onClose ao pressionar Escape", async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    await userEvent.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sem título usa o rótulo acessível "Janela" e não mostra botão Fechar', () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Janela" })).toBeInTheDocument();
    expect(screen.getByText("Janela")).toHaveClass("sr-only");
    expect(screen.queryByRole("button", { name: "Fechar" })).not.toBeInTheDocument();
  });

  it("renderiza o footer quando informado", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria" footer={<button>Salvar</button>}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("não renderiza área de footer quando ele não é informado", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog").querySelector(".border-t")).toBeNull();
  });

  it.each([
    ["sm", "max-w-sm"],
    ["md", "max-w-lg"],
    ["lg", "max-w-2xl"],
  ] as const)('aplica a largura "%s"', (width, expected) => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria" width={width}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass(expected);
  });

  it("usa largura md por padrão", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-w-lg");
  });

  it("mescla o className recebido", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Nova categoria" className="border-2">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("border-2");
  });
});
