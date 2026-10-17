import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Legend } from "./Legend";

describe("Legend", () => {
  it("lista os itens com o quadradinho de cada estado", () => {
    render(
      <Legend
        items={[
          { label: "Paga", swatch: "paid" },
          { label: "valor atual", swatch: "solid", color: "#6841c7" },
          { label: "deixa de existir", swatch: "cut" },
        ]}
      />,
    );
    const items = screen.getAllByRole("listitem");

    expect(items.map((item) => item.textContent)).toEqual([
      "Paga",
      "valor atual",
      "deixa de existir",
    ]);
    expect(items[0].querySelector("i")).toHaveClass("bg-tipo-parcelada");
    expect(items[1].querySelector("i")).toHaveStyle({ backgroundColor: "#6841c7" });
    expect(items[2].querySelector("i")).toHaveClass("bg-hatch");
  });
});
