import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EntryRow } from "./EntryRow";

describe("EntryRow", () => {
  it("monta o subtítulo com · e mostra a sublegenda e o progresso da parcelada", () => {
    render(
      <EntryRow
        kind="parcelada"
        title="Notebook"
        subtitle={["Eletrônicos", "Parcela 3 de 12", "termina Mai/27"]}
        amount={400}
        amountCaption="de R$ 4.800,00"
        tone="expense"
        progress={{ current: 3, total: 12 }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Eletrônicos · Parcela 3 de 12 · termina Mai/27")).toBeInTheDocument();
    expect(screen.getByText("de R$ 4.800,00")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Parcela 3 de 12" })).toHaveAttribute(
      "aria-valuenow",
      "25",
    );
    expect(screen.getByText("R$ 400,00")).toHaveClass("text-red");
  });

  it("mostra o selo de reajuste com o valor anterior", () => {
    render(
      <EntryRow
        kind="recorrente"
        title="Aluguel"
        subtitle={["Moradia"]}
        amount={120}
        amountCaption="por mês"
        tone="expense"
        previousAmount={100}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByText(/reajuste · era R\$ 100,00/)).toBeInTheDocument();
  });

  it("omite selo, subtítulo, sublegenda e progresso quando não se aplicam", () => {
    render(
      <EntryRow
        kind="avulsa"
        title="Freelance"
        subtitle={[]}
        amount={800}
        tone="revenue"
        previousAmount={null}
        onClick={vi.fn()}
      />,
    );

    expect(screen.queryByText(/reajuste/)).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveAccessibleName(/^Freelance\s*R\$\s800,00$/);
    expect(screen.getByText("R$ 800,00")).toHaveClass("text-green");
  });

  it("abre por teclado: Tab até a linha e Enter", async () => {
    const onClick = vi.fn();
    render(
      <EntryRow
        kind="avulsa"
        title="Farmácia"
        subtitle={[]}
        amount={50}
        tone="expense"
        onClick={onClick}
      />,
    );

    await userEvent.tab();
    expect(screen.getByRole("button", { name: /Farmácia/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("desenha o contorno de foco vermelho sólido de 2 px", () => {
    render(
      <EntryRow
        kind="avulsa"
        title="Farmácia"
        subtitle={[]}
        amount={50}
        tone="expense"
        onClick={vi.fn()}
      />,
    );

    // Com `outline` junto, o `cn()` da v4 o funde em `outline-2`; aqui só cabe o par coerente.
    expect(screen.getByRole("button", { name: /Farmácia/ })).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-red",
    );
  });
});
