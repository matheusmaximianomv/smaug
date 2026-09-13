import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { MonthYearSelect } from "./MonthYearSelect";

/** Só o Date é falseado: o user-event continua usando timers reais. */
beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderSelect(props: Partial<React.ComponentProps<typeof MonthYearSelect>> = {}) {
  const onMonthChange = vi.fn();
  const onYearChange = vi.fn();
  render(
    <MonthYearSelect
      label="Competência"
      month={9}
      year={2026}
      onMonthChange={onMonthChange}
      onYearChange={onYearChange}
      {...props}
    />,
  );
  return { onMonthChange, onYearChange };
}

describe("MonthYearSelect", () => {
  it("rotula os dois selects a partir do label", () => {
    renderSelect();

    expect(screen.getByLabelText("Competência — mês")).toBeInTheDocument();
    expect(screen.getByLabelText("Competência — ano")).toBeInTheDocument();
  });

  it('usa "Competência" como rótulo padrão dos selects quando não há label', () => {
    renderSelect({ label: undefined });

    expect(screen.getByLabelText("Competência — mês")).toBeInTheDocument();
    expect(screen.queryByText("Competência")).not.toBeInTheDocument();
  });

  it("oferece os 12 meses por extenso", () => {
    renderSelect();
    const monthSelect = screen.getByLabelText("Competência — mês");

    const options = within(monthSelect).getAllByRole("option");
    expect(options).toHaveLength(12);
    expect(options[0]).toHaveTextContent("Janeiro");
    expect(options[11]).toHaveTextContent("Dezembro");
  });

  it("oferece 5 anos a partir do ano anterior ao corrente", () => {
    renderSelect();
    const yearSelect = screen.getByLabelText("Competência — ano");

    expect(
      within(yearSelect)
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["2025", "2026", "2027", "2028", "2029"]);
  });

  it("reflete o mês e o ano recebidos", () => {
    renderSelect({ month: 12, year: 2027 });

    expect(screen.getByLabelText("Competência — mês")).toHaveValue("12");
    expect(screen.getByLabelText("Competência — ano")).toHaveValue("2027");
  });

  it("entrega o mês como Number, não como string", async () => {
    const { onMonthChange } = renderSelect();

    await userEvent.selectOptions(screen.getByLabelText("Competência — mês"), "3");

    expect(onMonthChange).toHaveBeenCalledWith(3);
    expect(onMonthChange).not.toHaveBeenCalledWith("3");
  });

  it("entrega o ano como Number, não como string", async () => {
    const { onYearChange } = renderSelect();

    await userEvent.selectOptions(screen.getByLabelText("Competência — ano"), "2028");

    expect(onYearChange).toHaveBeenCalledWith(2028);
    expect(onYearChange).not.toHaveBeenCalledWith("2028");
  });

  it("renderiza o asterisco quando required", () => {
    renderSelect({ required: true });

    expect(screen.getByText("*")).toBeInTheDocument();
  });

  it("não renderiza asterisco quando não é required", () => {
    renderSelect();

    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });

  it("exibe a mensagem de erro", () => {
    renderSelect({ error: "Não é permitido criar receitas em competências passadas." });

    expect(
      screen.getByText("Não é permitido criar receitas em competências passadas."),
    ).toBeInTheDocument();
  });

  it("não exibe erro quando não há", () => {
    renderSelect();

    expect(document.querySelector("p")).toBeNull();
  });
});
