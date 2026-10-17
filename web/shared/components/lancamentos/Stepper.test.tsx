import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Stepper } from "./Stepper";

describe("Stepper", () => {
  it("incrementa e decrementa", async () => {
    const onChange = vi.fn();
    render(<Stepper label="Nº de parcelas" value={2} onChange={onChange} hint="1 a 72" />);

    await userEvent.click(screen.getByRole("button", { name: "Aumentar" }));
    await userEvent.click(screen.getByRole("button", { name: "Diminuir" }));

    expect(onChange.mock.calls).toEqual([[3], [1]]);
    expect(screen.getByLabelText(/Nº de parcelas/)).toHaveAccessibleDescription("1 a 72");
  });

  it("desabilita os botões nos limites 1 e 72", () => {
    const { rerender } = render(<Stepper label="Parcelas" value={1} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Diminuir" })).toBeDisabled();

    rerender(<Stepper label="Parcelas" value={72} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Aumentar" })).toBeDisabled();
  });

  it("prende a digitação ao intervalo e trata lixo como o mínimo", () => {
    const onChange = vi.fn();
    render(<Stepper label="Parcelas" value={2} onChange={onChange} />);
    const input = screen.getByLabelText(/Parcelas/);

    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.change(input, { target: { value: "abc" } });

    expect(onChange.mock.calls).toEqual([[72], [1], [1]]);
  });

  it("mostra o erro no lugar da dica", () => {
    render(
      <Stepper label="Parcelas" value={2} onChange={vi.fn()} hint="1 a 72" error="Entre 1 e 72" />,
    );

    expect(screen.queryByText("1 a 72")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Parcelas/)).toHaveAccessibleDescription("Entre 1 e 72");
    expect(screen.getByLabelText(/Parcelas/)).toHaveAttribute("aria-invalid", "true");
  });

  it("não descreve o campo sem dica nem erro", () => {
    render(<Stepper label="Parcelas" value={2} onChange={vi.fn()} />);

    expect(screen.getByLabelText(/Parcelas/)).not.toHaveAttribute("aria-describedby");
  });
});
