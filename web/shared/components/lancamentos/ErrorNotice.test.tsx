import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorNotice } from "./ErrorNotice";
import { FichaPlaceholder } from "./FichaPlaceholder";

describe("ErrorNotice", () => {
  it('mostra a mensagem e repete por "Tentar novamente"', async () => {
    const onRetry = vi.fn();
    render(<ErrorNotice message="Sem conexão." onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Sem conexão.");
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(onRetry).toHaveBeenCalled();
  });
});

describe("FichaPlaceholder", () => {
  it("mostra o esqueleto enquanto carrega", () => {
    render(
      <FichaPlaceholder title="Aluguel" errorMessage={null} onRetry={vi.fn()} onClose={vi.fn()} />,
    );

    expect(
      screen.getByRole("dialog", { name: "Aluguel" }).querySelector("[aria-busy]"),
    ).not.toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("mostra o erro com a ação de repetir", () => {
    render(
      <FichaPlaceholder
        title="Aluguel"
        errorMessage="Falhou."
        onRetry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
  });
});
