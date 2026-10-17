import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepIndicator } from "./StepIndicator";

describe("StepIndicator", () => {
  it("destaca a etapa atual e marca as concluídas com ✓", () => {
    render(<StepIndicator steps={["Tipo", "Detalhes", "Revisão"]} current={1} />);
    const items = screen.getAllByRole("listitem");

    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(screen.getByLabelText("concluída")).toBeInTheDocument();
    expect(items[2]).toHaveTextContent("3Revisão");
  });

  it("esconde os rótulos visualmente no celular, mantendo-os acessíveis", () => {
    render(<StepIndicator steps={["Tipo", "Detalhes", "Revisão"]} current={0} />);

    expect(screen.getByText("Tipo")).toHaveClass("max-md:sr-only");
  });
});
