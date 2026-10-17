import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { FactGrid } from "./FactGrid";

describe("FactGrid", () => {
  it("renderiza rótulo, valor e legenda de cada fato", () => {
    render(
      <FactGrid
        columns={4}
        facts={[
          { label: "Pago", value: "R$ 33,34", caption: "1 parcela" },
          { label: "Parcela atual", value: "2/3" },
        ]}
      />,
    );

    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("R$ 33,34")).toBeInTheDocument();
    expect(screen.getByText("1 parcela")).toBeInTheDocument();
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("2/3").closest("dl")).toHaveClass("grid-cols-4");
  });

  it("aceita 3 colunas", () => {
    render(<FactGrid columns={3} facts={[{ label: "Situação", value: "Prevista" }]} />);

    expect(screen.getByText("Prevista").closest("dl")).toHaveClass(
      "grid-cols-3",
      "max-md:grid-cols-2",
    );
  });
});
