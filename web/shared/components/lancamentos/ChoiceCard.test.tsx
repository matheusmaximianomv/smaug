import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ChoiceCardGroup, type ChoiceOption } from "./ChoiceCard";

type Kind = "avulsa" | "parcelada" | "recorrente";

const OPTIONS: ChoiceOption<Kind>[] = [
  {
    value: "avulsa",
    title: "Avulsa",
    description: "Acontece uma única vez.",
    example: "farmácia",
    illustration: <i />,
  },
  { value: "parcelada", title: "Parcelada" },
  { value: "recorrente", title: "Recorrente" },
];

function Controlled({ onChange = vi.fn() }: { onChange?: (v: Kind) => void }) {
  const [value, setValue] = useState<Kind>("avulsa");
  return (
    <ChoiceCardGroup
      label="Tipo"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
      options={OPTIONS}
    />
  );
}

describe("ChoiceCardGroup", () => {
  it("expõe um radiogroup com o selecionado marcado e só ele no Tab", () => {
    render(<Controlled />);

    expect(screen.getByRole("radiogroup", { name: "Tipo" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Avulsa/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /Avulsa/ })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: "Parcelada" })).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("farmácia")).toBeInTheDocument();
  });

  it("seleciona por clique", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);

    await userEvent.click(screen.getByRole("radio", { name: "Recorrente" }));

    expect(onChange).toHaveBeenCalledWith("recorrente");
    expect(screen.getByRole("radio", { name: "Recorrente" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("navega pelas setas, com volta circular, movendo o foco", async () => {
    render(<Controlled />);
    await userEvent.tab();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Parcelada" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Parcelada" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Avulsa/ })).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Recorrente" })).toHaveFocus();

    await userEvent.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: "Parcelada" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("ignora outras teclas", async () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    await userEvent.tab();

    await userEvent.keyboard("a");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("usa o verde no tom de receita", () => {
    render(
      <ChoiceCardGroup
        label="Modalidade"
        value="parcelada"
        onChange={vi.fn()}
        options={OPTIONS}
        tone="revenue"
      />,
    );

    expect(screen.getByRole("radio", { name: "Parcelada" })).toHaveClass("border-green");
  });
});
