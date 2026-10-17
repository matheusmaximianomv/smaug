import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoneyField } from "./MoneyField";

describe("MoneyField", () => {
  it("associa o rótulo, mostra o prefixo R$ e aceita digitação", async () => {
    render(<MoneyField label="Valor total" tone="expense" />);
    const input = screen.getByLabelText(/Valor total/);

    await userEvent.type(input, "1.234,56");

    expect(input).toHaveValue("1.234,56");
    expect(input).toHaveClass("text-red");
    expect(screen.getByText("R$")).toBeInTheDocument();
  });

  it("liga a mensagem de erro ao campo", () => {
    render(<MoneyField label="Valor" tone="revenue" error="Valor inválido" />);
    const input = screen.getByLabelText(/Valor/);

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Valor inválido");
    expect(input).toHaveClass("text-green");
  });

  it("respeita o id recebido", () => {
    render(<MoneyField label="Valor" tone="expense" id="valor" />);

    expect(screen.getByLabelText(/Valor/)).toHaveAttribute("id", "valor");
  });
});
