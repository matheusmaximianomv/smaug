import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MonthCells, type MonthCell } from "./MonthCells";

const cell = (o: Partial<MonthCell> & Pick<MonthCell, "key" | "state">): MonthCell => ({
  month: "Abr/26",
  ...o,
});

describe("MonthCells de parcelas", () => {
  it("diferencia paga, atual e pendente", () => {
    render(
      <MonthCells
        label="Parcelas"
        cells={[
          cell({ key: "1", state: "paid", top: "1/3", month: "Mar/26", value: "33,34" }),
          cell({ key: "2", state: "current", top: "2/3", month: "Abr/26", value: "33,33" }),
          cell({ key: "3", state: "pending", top: "3/3", month: "Mai/26", value: "33,33" }),
        ]}
      />,
    );
    const [paid, current, pending] = within(
      screen.getByRole("list", { name: "Parcelas" }),
    ).getAllByRole("listitem");

    expect(paid).toHaveTextContent("1/3pagaMar/2633,34");
    expect(current).toHaveTextContent("2/3ATUALatualAbr/26");
    expect(pending).toHaveTextContent("pendente");
    expect(within(current).getByText("2/3")).toHaveClass("text-red");
  });
});

describe("MonthCells de linha do tempo", () => {
  it("pinta com a cor da versão, contorna a referência e mostra continua…", () => {
    render(
      <MonthCells
        label="Linha do tempo"
        trailing="continua…"
        cells={[
          cell({
            key: "a",
            state: "normal",
            month: "Abr/26",
            value: "100",
            color: "#6841c7",
            isReference: true,
          }),
          cell({ key: "b", state: "normal", month: "Mai/26", color: "#6841c7" }),
        ]}
      />,
    );
    const [reference, next] = screen.getAllByRole("listitem");

    expect(reference).toHaveAttribute("aria-current", "date");
    expect(next).not.toHaveAttribute("aria-current");
    expect(within(reference).getByText("Abr/26")).toHaveClass("font-extrabold");
    expect(screen.getByText("continua…")).toBeInTheDocument();
  });

  it("listra a nova versão e hachura e risca o mês cortado, sem cor de fundo", () => {
    render(
      <MonthCells
        label="Prévia"
        cells={[
          cell({ key: "n", state: "new", month: "Ago/26", value: "130", color: "#6841c7" }),
          cell({ key: "c", state: "cut", month: "Out/26", color: "#6841c7" }),
          cell({ key: "x", state: "normal", month: "Nov/26" }),
        ]}
      />,
    );
    const [added, cut, plain] = screen.getAllByRole("listitem");

    expect(within(added).getByText("nova versão").parentElement).toHaveClass("bg-stripes");
    expect(within(added).getByText("nova versão").parentElement).toHaveStyle({
      backgroundColor: "#6841c7",
    });
    expect(within(cut).getByText("deixa de existir").parentElement).toHaveClass("bg-hatch");
    expect(
      within(cut).getByText("deixa de existir").parentElement?.getAttribute("style"),
    ).toBeNull();
    expect(within(cut).getByText("Out/26")).toHaveClass("line-through");
    expect(plain.querySelector(".sr-only")).toBeNull();
    expect(within(plain).getByText("Nov/26").previousElementSibling).toHaveClass("bg-bg", "border");
    expect(screen.queryByText("continua…")).not.toBeInTheDocument();
  });
});
