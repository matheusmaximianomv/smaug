import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal, ModalGate } from "./Modal";

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
    ["xl", "max-w-[680px]"],
    ["2xl", "max-w-[760px]"],
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

describe("Modal com cabeçalho customizado", () => {
  it("renderiza o header no lugar do título visível, mantendo o título como nome acessível", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Aluguel" header={<div>Cabeçalho rico</div>}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Aluguel" })).toBeInTheDocument();
    expect(screen.getByText("Cabeçalho rico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar" })).toBeInTheDocument();
  });

  it('usa "Janela" como nome acessível quando há header sem título', () => {
    render(
      <Modal isOpen onClose={vi.fn()} header={<div>Cabeçalho</div>}>
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog", { name: "Janela" })).toBeInTheDocument();
  });
});

describe("Modal camadas e folha inferior", () => {
  it("usa a camada base por padrão e top quando pedido", () => {
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Ficha">
        <p>Conteúdo</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("z-50");

    rerender(
      <Modal isOpen onClose={vi.fn()} title="Ficha" layer="top">
        <p>Conteúdo</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog")).toHaveClass("z-60");
  });

  it("ancora na base da tela até 768 px", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Ficha">
        <p>Conteúdo</p>
      </Modal>,
    );

    expect(screen.getByRole("dialog")).toHaveClass("max-md:top-auto", "max-md:bottom-2.5");
  });
});

describe("Modal animação", () => {
  it("anima fundo e painel na entrada e na saída, só sem movimento reduzido", () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Ficha">
        <p>Conteúdo</p>
      </Modal>,
    );
    const panel = screen.getByRole("dialog");
    // O fundo não tem papel acessível; o Radix o renderiza logo antes do painel.
    const overlay = panel.previousElementSibling;

    expect(overlay).toHaveClass(
      "motion-safe:data-[state=open]:animate-in",
      "motion-safe:data-[state=open]:fade-in",
      "motion-safe:data-[state=closed]:animate-out",
      "motion-safe:data-[state=closed]:fade-out",
    );
    expect(panel).toHaveClass(
      "motion-safe:data-[state=open]:animate-in",
      "motion-safe:data-[state=open]:md:zoom-in-95",
      "motion-safe:data-[state=open]:max-md:slide-in-from-bottom-4",
      "motion-safe:data-[state=closed]:animate-out",
      "motion-safe:data-[state=closed]:md:zoom-out-95",
      "motion-safe:data-[state=closed]:max-md:slide-out-to-bottom-4",
    );
  });
});

describe("ModalGate", () => {
  it("fecha o modal de dentro sem que ele seja desmontado por quem o desenha", () => {
    const { rerender } = render(
      <ModalGate isOpen origin={null}>
        <Modal isOpen onClose={vi.fn()} title="Ficha">
          <p>Conteúdo</p>
        </Modal>
      </ModalGate>,
    );
    expect(screen.getByRole("dialog", { name: "Ficha" })).toBeInTheDocument();

    rerender(
      <ModalGate isOpen={false} origin={null}>
        <Modal isOpen onClose={vi.fn()} title="Ficha">
          <p>Conteúdo</p>
        </Modal>
      </ModalGate>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Modal foco", () => {
  function Opener() {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <button onClick={() => setIsOpen(true)}>Aluguel</button>
        <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Ficha">
          <button>Remover</button>
        </Modal>
      </>
    );
  }

  it("devolve o foco a quem abriu o modal ao fechar", async () => {
    render(<Opener />);

    await userEvent.click(screen.getByRole("button", { name: "Aluguel" }));
    expect(screen.getByRole("dialog")).toContainElement(document.activeElement as HTMLElement);
    await userEvent.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aluguel" })).toHaveFocus();
  });
});

describe("Modal foco com ModalGate", () => {
  function Layer({
    isOpen,
    origin,
    which,
  }: {
    isOpen: boolean;
    origin: HTMLElement;
    which: string;
  }) {
    // `key` distinta: a troca de `which` simula a Ficha substituindo o placeholder.
    return (
      <ModalGate isOpen={isOpen} origin={origin}>
        <Modal key={which} isOpen onClose={vi.fn()} title={which}>
          <button>Ação {which}</button>
        </Modal>
      </ModalGate>
    );
  }

  function setup() {
    const row = document.createElement("button");
    row.textContent = "Linha";
    document.body.appendChild(row);
    return row;
  }

  it("devolve o foco à origem da camada quando o modal nasceu com o foco no body", async () => {
    const row = setup();
    const { rerender } = render(<Layer isOpen origin={row} which="Ficha" />);

    rerender(<Layer isOpen={false} origin={row} which="Ficha" />);

    await waitFor(() => expect(row).toHaveFocus());
    row.remove();
  });

  it("não devolve o foco quando o modal é trocado por outro com a camada aberta", async () => {
    const row = setup();
    const focus = vi.spyOn(row, "focus");
    const { rerender } = render(<Layer isOpen origin={row} which="Carregando" />);

    rerender(<Layer isOpen origin={row} which="Ficha" />);

    // O Radix dispara a devolução num setTimeout após desmontar o modal trocado.
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole("dialog", { name: "Ficha" })).toBeInTheDocument();
    expect(focus).not.toHaveBeenCalled();
    row.remove();
  });

  it("sem portão nem origem, fechar não move o foco para lugar algum", async () => {
    const { rerender } = render(
      <Modal isOpen onClose={vi.fn()} title="Ficha">
        <p>Conteúdo</p>
      </Modal>,
    );

    rerender(
      <Modal isOpen={false} onClose={vi.fn()} title="Ficha">
        <p>Conteúdo</p>
      </Modal>,
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(document.body).toHaveFocus();
  });
});
