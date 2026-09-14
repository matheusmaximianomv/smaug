import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodeChip } from "./CodeChip";

describe("CodeChip", () => {
  it("renderiza o conteúdo dentro de um elemento code", () => {
    render(<CodeChip>serie_id</CodeChip>);

    const chip = screen.getByText("serie_id");
    expect(chip.tagName).toBe("CODE");
  });

  it("aplica a moldura de pastilha do protótipo", () => {
    render(<CodeChip>;</CodeChip>);

    expect(screen.getByText(";")).toHaveClass("border", "border-border", "bg-bg");
  });
});
