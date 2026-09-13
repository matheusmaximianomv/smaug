import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonthNavigator } from "./MonthNavigator";

const base = {
  year: 2026,
  month: 9,
  status: "current" as const,
  onChange: vi.fn(),
};

describe("MonthNavigator", () => {
  it("exibe o mês por extenso e o ano", () => {
    render(<MonthNavigator {...base} onChange={vi.fn()} />);

    expect(screen.getByText("Setembro de 2026")).toBeInTheDocument();
  });

  it.each([
    ["current", "Mês vigente"],
    ["future", "Projeção"],
    ["past", "Passado"],
  ] as const)('exibe o badge "%s" como "%s"', (status, label) => {
    render(<MonthNavigator {...base} status={status} onChange={vi.fn()} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("navega para o mês anterior", async () => {
    const onChange = vi.fn();
    render(<MonthNavigator {...base} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(onChange).toHaveBeenCalledWith(2026, 8);
  });

  it("navega para o próximo mês", async () => {
    const onChange = vi.fn();
    render(<MonthNavigator {...base} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(onChange).toHaveBeenCalledWith(2026, 10);
  });

  it("faz rollover de dezembro para janeiro do ano seguinte", async () => {
    const onChange = vi.fn();
    render(<MonthNavigator {...base} month={12} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(onChange).toHaveBeenCalledWith(2027, 1);
  });

  it("faz rollover de janeiro para dezembro do ano anterior", async () => {
    const onChange = vi.fn();
    render(<MonthNavigator {...base} month={1} onChange={onChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));

    expect(onChange).toHaveBeenCalledWith(2025, 12);
  });

  it("mescla o className recebido", () => {
    const { container } = render(<MonthNavigator {...base} onChange={vi.fn()} className="mb-6" />);

    expect(container.firstChild).toHaveClass("mb-6");
  });
});

describe('atalho "← Mês atual"', () => {
  it("aparece em mês passado quando há onGoToCurrent", () => {
    render(<MonthNavigator {...base} status="past" onChange={vi.fn()} onGoToCurrent={vi.fn()} />);

    expect(screen.getByRole("button", { name: "← Mês atual" })).toBeInTheDocument();
  });

  it("aparece em mês futuro quando há onGoToCurrent", () => {
    render(<MonthNavigator {...base} status="future" onChange={vi.fn()} onGoToCurrent={vi.fn()} />);

    expect(screen.getByRole("button", { name: "← Mês atual" })).toBeInTheDocument();
  });

  it("NÃO aparece no mês vigente", () => {
    render(
      <MonthNavigator {...base} status="current" onChange={vi.fn()} onGoToCurrent={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "← Mês atual" })).not.toBeInTheDocument();
  });

  it("NÃO aparece sem onGoToCurrent", () => {
    render(<MonthNavigator {...base} status="past" onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "← Mês atual" })).not.toBeInTheDocument();
  });

  it("chama onGoToCurrent ao ser clicado", async () => {
    const onGoToCurrent = vi.fn();
    render(
      <MonthNavigator {...base} status="past" onChange={vi.fn()} onGoToCurrent={onGoToCurrent} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "← Mês atual" }));

    expect(onGoToCurrent).toHaveBeenCalledTimes(1);
  });
});
