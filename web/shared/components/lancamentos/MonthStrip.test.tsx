import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthStrip, type MonthStripCell } from "./MonthStrip";

const LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function cells(overrides: Record<number, Partial<MonthStripCell>> = {}): MonthStripCell[] {
  return LABELS.map((label, i) => ({
    month: i + 1,
    label,
    total: null,
    selected: false,
    isCurrent: false,
    ...overrides[i + 1],
  }));
}

describe("MonthStrip", () => {
  it("mostra o total compacto ou — quando o mês não tem lançamentos", () => {
    render(
      <MonthStrip cells={cells({ 3: { total: 3420.75 }, 4: { total: 0 } })} onSelect={vi.fn()} />,
    );

    expect(
      within(screen.getByRole("button", { name: /Mar/ })).getByText("3.420"),
    ).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Abr/ })).getByText("—")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Jan/ })).getByText("—")).toBeInTheDocument();
  });

  it("destaca o mês selecionado e marca o mês corrente com o ponto", () => {
    render(
      <MonthStrip
        cells={cells({ 6: { selected: true }, 4: { isCurrent: true } })}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /Jun/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Mai/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Abr/ })).toHaveAccessibleName(
      /^Abr\s*—\s*\(mês atual\)$/,
    );
  });

  it("seleciona o mês clicado", async () => {
    const onSelect = vi.fn();
    render(<MonthStrip cells={cells()} onSelect={onSelect} />);

    await userEvent.click(screen.getByRole("button", { name: /Jun/ }));

    expect(onSelect).toHaveBeenCalledWith(6);
  });
});
