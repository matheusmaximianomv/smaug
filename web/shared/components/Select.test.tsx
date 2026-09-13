import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select";

const OPTIONS = [
  { value: "cat-1", label: "Moradia" },
  { value: "cat-2", label: "Alimentação" },
];

describe("Select", () => {
  it("associa o label ao campo", () => {
    render(<Select label="Categoria" options={OPTIONS} />);

    expect(screen.getByLabelText("Categoria")).toBeInstanceOf(HTMLSelectElement);
  });

  it("não renderiza label quando nenhum é informado", () => {
    const { container } = render(<Select options={OPTIONS} aria-label="Categoria" />);

    expect(container.querySelector("label")).toBeNull();
  });

  it('exibe o placeholder padrão "Selecione..."', () => {
    render(<Select label="Categoria" options={OPTIONS} />);

    expect(screen.getByRole("option", { name: "Selecione..." })).toHaveValue("");
  });

  it("exibe um placeholder custom", () => {
    render(<Select label="Categoria" options={OPTIONS} placeholder="Escolha uma categoria" />);

    expect(screen.getByRole("option", { name: "Escolha uma categoria" })).toBeInTheDocument();
  });

  it("omite a opção vazia quando o placeholder é string vazia", () => {
    render(<Select label="Categoria" options={OPTIONS} placeholder="" />);

    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("renderiza uma opção por item de options", () => {
    render(<Select label="Categoria" options={OPTIONS} />);

    expect(screen.getByRole("option", { name: "Moradia" })).toHaveValue("cat-1");
    expect(screen.getByRole("option", { name: "Alimentação" })).toHaveValue("cat-2");
  });

  it("renderiza apenas o placeholder quando options está vazio", () => {
    render(<Select label="Categoria" options={[]} />);

    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("entrega o valor escolhido ao onChange", async () => {
    const onChange = vi.fn();
    render(<Select label="Categoria" options={OPTIONS} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByLabelText("Categoria"), "cat-2");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].target.value).toBe("cat-2");
  });

  it("exibe a mensagem de erro com aria-invalid e aria-describedby", () => {
    render(<Select label="Categoria" options={OPTIONS} error="Selecione uma categoria." />);
    const select = screen.getByLabelText("Categoria");

    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument();
    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAccessibleDescription("Selecione uma categoria.");
  });

  it("não marca aria-invalid sem erro", () => {
    render(<Select label="Categoria" options={OPTIONS} />);

    expect(screen.getByLabelText("Categoria")).not.toHaveAttribute("aria-invalid");
  });

  it("dá precedência ao id explícito sobre o gerado", () => {
    render(<Select id="categoria" label="Categoria" options={OPTIONS} error="Obrigatório." />);

    expect(screen.getByLabelText("Categoria")).toHaveAttribute("id", "categoria");
    expect(screen.getByLabelText("Categoria")).toHaveAttribute(
      "aria-describedby",
      "categoria-error",
    );
  });

  it("encaminha a ref para o elemento select", () => {
    const ref = createRef<HTMLSelectElement>();

    render(<Select label="Categoria" options={OPTIONS} ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });

  it("mescla o className recebido e repassa atributos nativos", () => {
    render(<Select label="Categoria" options={OPTIONS} className="w-40" disabled />);

    expect(screen.getByLabelText("Categoria")).toHaveClass("w-40", "rounded-lg");
    expect(screen.getByLabelText("Categoria")).toBeDisabled();
  });
});
