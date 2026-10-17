import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("expõe o progresso em porcentagem", () => {
    render(<ProgressBar value={1 / 3} label="Parcela 1 de 3" />);

    expect(screen.getByRole("progressbar", { name: "Parcela 1 de 3" })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );
  });

  it("limita o valor entre 0 e 100", () => {
    render(
      <>
        <ProgressBar value={2} label="acima" />
        <ProgressBar value={-1} label="abaixo" />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "acima" })).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByRole("progressbar", { name: "abaixo" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
