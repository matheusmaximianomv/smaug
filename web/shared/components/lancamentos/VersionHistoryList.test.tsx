import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { VersionHistoryList } from "./VersionHistoryList";

describe("VersionHistoryList", () => {
  it("mostra vigente e anterior, com categoria quando houver", () => {
    render(
      <VersionHistoryList
        tone="expense"
        rows={[
          {
            key: "2",
            from: "A partir de Mai/26",
            description: "Aluguel",
            detail: "Moradia",
            isCurrent: true,
            amount: "R$ 120,00/mês",
          },
          {
            key: "1",
            from: "A partir de Jan/26",
            description: "Aluguel",
            isCurrent: false,
            amount: "R$ 100,00/mês",
          },
        ]}
      />,
    );
    const [current, previous] = screen.getAllByRole("listitem");

    expect(within(current).getByText("Vigente")).toBeInTheDocument();
    expect(within(current).getByText("Moradia")).toBeInTheDocument();
    expect(within(current).getByText("R$ 120,00/mês")).toHaveClass("text-red");
    expect(within(previous).getByText("Anterior")).toBeInTheDocument();
    expect(within(previous).getByText("R$ 100,00/mês")).not.toHaveClass("text-red");
    expect(previous).toHaveClass("text-text-subtle");
  });
});
