import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { VersionChips } from "./VersionChips";

describe("VersionChips", () => {
  it('mostra desde/valor e a pílula "Vigente" só na versão em vigor', () => {
    render(
      <VersionChips
        versions={[
          { key: "1", since: "desde Jan/26", amount: "R$ 100,00", color: "#aaa", isCurrent: false },
          { key: "2", since: "desde Mai/26", amount: "R$ 120,00", color: "#bbb", isCurrent: true },
        ]}
      />,
    );
    const [first, second] = screen.getAllByRole("listitem");

    expect(first).toHaveTextContent("desde Jan/26R$ 100,00");
    expect(within(first).queryByText("Vigente")).not.toBeInTheDocument();
    expect(within(second).getByText("Vigente")).toBeInTheDocument();
  });
});
