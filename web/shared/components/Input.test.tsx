import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";

describe("Input", () => {
  it("associa o label ao campo, tornando getByLabelText utilizável", () => {
    render(<Input label="Descrição" />);

    expect(screen.getByLabelText("Descrição")).toBeInstanceOf(HTMLInputElement);
  });

  it("não renderiza label quando nenhum é informado", () => {
    const { container } = render(<Input placeholder="Descrição" />);

    expect(container.querySelector("label")).toBeNull();
    expect(screen.getByPlaceholderText("Descrição")).toBeInTheDocument();
  });

  it("aceita digitação", async () => {
    render(<Input label="Descrição" />);

    await userEvent.type(screen.getByLabelText("Descrição"), "Supermercado");

    expect(screen.getByLabelText("Descrição")).toHaveValue("Supermercado");
  });

  it("dispara onChange", async () => {
    const onChange = vi.fn();
    render(<Input label="Descrição" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Descrição"), "ab");

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("exibe a mensagem de erro", () => {
    render(<Input label="Valor" error="Valor total inválido." />);

    expect(screen.getByText("Valor total inválido.")).toBeInTheDocument();
  });

  it("marca o campo com aria-invalid e aria-describedby quando há erro", () => {
    render(<Input label="Valor" error="Valor total inválido." />);
    const input = screen.getByLabelText("Valor");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Valor total inválido.");
  });

  it("não marca aria-invalid quando não há erro", () => {
    render(<Input label="Valor" />);

    expect(screen.getByLabelText("Valor")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("Valor")).not.toHaveAttribute("aria-describedby");
  });

  it("mostra erro mesmo sem label", () => {
    render(<Input error="Campo obrigatório." />);

    expect(screen.getByText("Campo obrigatório.")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveAccessibleDescription("Campo obrigatório.");
  });

  it("dá precedência ao id explícito sobre o gerado", () => {
    render(<Input id="descricao" label="Descrição" error="Obrigatório." />);
    const input = screen.getByLabelText("Descrição");

    expect(input).toHaveAttribute("id", "descricao");
    expect(input).toHaveAttribute("aria-describedby", "descricao-error");
  });

  it("gera ids distintos para dois campos sem id", () => {
    render(
      <>
        <Input label="Primeiro" />
        <Input label="Segundo" />
      </>,
    );

    expect(screen.getByLabelText("Primeiro").id).not.toBe(screen.getByLabelText("Segundo").id);
  });

  it("encaminha a ref para o elemento input", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input label="Descrição" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("mescla o className recebido", () => {
    render(<Input label="Descrição" className="text-right" />);

    expect(screen.getByLabelText("Descrição")).toHaveClass("text-right", "rounded-lg");
  });

  it("repassa atributos nativos como type e disabled", () => {
    render(<Input label="Valor" type="number" disabled />);

    expect(screen.getByLabelText("Valor")).toBeDisabled();
    expect(screen.getByLabelText("Valor")).toHaveAttribute("type", "number");
  });
});
