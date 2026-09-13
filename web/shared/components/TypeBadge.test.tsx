import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { type EntryType, TypeBadge } from "./TypeBadge";

describe("TypeBadge", () => {
  it.each([
    ["ONE_TIME", "Avulsa"],
    ["avulsa", "Avulsa"],
    ["FIXED", "Fixa"],
    ["fixa", "Fixa"],
    ["INSTALLMENT", "Parcelada"],
    ["parcelada", "Parcelada"],
    ["RECURRING", "Recorrente"],
    ["recorrente", "Recorrente"],
  ] as [EntryType, string][])('rotula o tipo "%s" como "%s"', (type, label) => {
    render(<TypeBadge type={type} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("não renderiza nada para um tipo desconhecido", () => {
    const { container } = render(<TypeBadge type={"DESCONHECIDO" as EntryType} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("mescla o className recebido", () => {
    render(<TypeBadge type="FIXED" className="ml-2" />);

    expect(screen.getByText("Fixa")).toHaveClass("ml-2", "rounded-full");
  });

  it("usa cores distintas para receita fixa e despesa parcelada", () => {
    const { rerender } = render(<TypeBadge type="FIXED" />);
    const fixed = screen.getByText("Fixa").className;

    rerender(<TypeBadge type="INSTALLMENT" />);

    expect(screen.getByText("Parcelada").className).not.toBe(fixed);
  });
});
