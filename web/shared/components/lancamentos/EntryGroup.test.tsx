import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { EntryGroup } from "./EntryGroup";

describe("EntryGroup", () => {
  it("mostra nome, contador e subtotal e envolve as linhas", () => {
    render(
      <EntryGroup title="Recorrentes" count={2} subtotal={1234.5}>
        <p>linha</p>
      </EntryGroup>,
    );
    const group = screen.getByRole("region", { name: "Recorrentes" });

    expect(within(group).getByRole("heading", { name: "Recorrentes" })).toBeInTheDocument();
    expect(within(group).getByText("2")).toBeInTheDocument();
    expect(within(group).getByText("R$ 1.234,50")).toBeInTheDocument();
    expect(within(group).getByText("linha")).toBeInTheDocument();
  });
});
