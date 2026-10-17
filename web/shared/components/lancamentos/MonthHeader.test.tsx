import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthHeader } from "./MonthHeader";

function setup(isCurrent: boolean) {
  const handlers = { onPrevious: vi.fn(), onNext: vi.fn(), onGoToCurrent: vi.fn() };
  render(<MonthHeader competence={{ year: 2026, month: 4 }} isCurrent={isCurrent} {...handlers} />);
  return handlers;
}

describe("MonthHeader no mês atual", () => {
  it('mostra o mês por extenso e a pílula "Mês atual"', () => {
    setup(true);

    expect(screen.getByRole("heading", { name: "Abril 2026" })).toBeInTheDocument();
    expect(screen.getByText("Mês atual")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Voltar para o mês atual" }),
    ).not.toBeInTheDocument();
  });

  it("navega pelas setas", async () => {
    const handlers = setup(true);

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(handlers.onPrevious).toHaveBeenCalledTimes(1);
    expect(handlers.onNext).toHaveBeenCalledTimes(1);
  });
});

describe("MonthHeader em outro mês", () => {
  it('troca a pílula por "Voltar para o mês atual"', async () => {
    const handlers = setup(false);

    expect(screen.queryByText("Mês atual")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar para o mês atual" }));

    expect(handlers.onGoToCurrent).toHaveBeenCalledTimes(1);
  });
});
