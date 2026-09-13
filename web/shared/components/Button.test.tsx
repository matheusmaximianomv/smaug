import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("renderiza o conteúdo recebido", () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("dispara onClick no clique", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fica desabilitado com disabled", () => {
    render(<Button disabled>Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("não dispara onClick quando desabilitado", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("fica desabilitado com isLoading", () => {
    // O spinner é um <span> sem role: a asserção correta é o estado do botão.
    render(<Button isLoading>Salvar</Button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("não dispara onClick enquanto carrega", async () => {
    const onClick = vi.fn();
    render(
      <Button isLoading onClick={onClick}>
        Salvar
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("exibe o spinner apenas enquanto carrega", () => {
    const { container, rerender } = render(<Button>Salvar</Button>);
    expect(container.querySelector(".animate-spin")).toBeNull();

    rerender(<Button isLoading>Salvar</Button>);

    expect(container.querySelector(".animate-spin")).not.toBeNull();
  });

  it.each([
    ["default", "bg-red"],
    ["outline", "border-border"],
    ["ghost", "hover:bg-bg"],
    ["danger", "bg-red"],
  ] as const)('aplica as classes da variante "%s"', (variant, expected) => {
    render(<Button variant={variant}>Salvar</Button>);

    expect(screen.getByRole("button")).toHaveClass(expected);
  });

  it.each([
    ["sm", "h-8"],
    ["md", "h-10"],
    ["lg", "h-12"],
  ] as const)('aplica a altura do tamanho "%s"', (size, expected) => {
    render(<Button size={size}>Salvar</Button>);

    expect(screen.getByRole("button")).toHaveClass(expected);
  });

  it("usa variante default e tamanho md quando nada é informado", () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole("button")).toHaveClass("bg-red", "h-10");
  });

  it("mescla o className recebido", () => {
    render(<Button className="w-full">Salvar</Button>);

    expect(screen.getByRole("button")).toHaveClass("w-full", "inline-flex");
  });

  it("encaminha a ref para o elemento button", () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Salvar</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe("Salvar");
  });

  it("submete o formulário pai com type=submit", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Salvar</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("repassa atributos nativos como aria-label", () => {
    render(<Button aria-label="Excluir categoria">×</Button>);

    expect(screen.getByRole("button", { name: "Excluir categoria" })).toBeInTheDocument();
  });
});
