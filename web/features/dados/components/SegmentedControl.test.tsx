import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedControl } from "./SegmentedControl";

const OPTIONS = [
  { value: "period", label: "Período" },
  { value: "full", label: "Base completa" },
];

describe("SegmentedControl", () => {
  it("expõe as opções como um grupo de rádio acessível", () => {
    render(
      <SegmentedControl label="Recorte" value="period" options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("radiogroup", { name: "Recorte" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("marca apenas a opção ativa", () => {
    render(
      <SegmentedControl label="Recorte" value="period" options={OPTIONS} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("radio", { name: "Período" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Base completa" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("avisa a escolha do usuário", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl label="Recorte" value="period" options={OPTIONS} onChange={onChange} />,
    );

    await userEvent.click(screen.getByRole("radio", { name: "Base completa" }));

    expect(onChange).toHaveBeenCalledWith("full");
  });
});
