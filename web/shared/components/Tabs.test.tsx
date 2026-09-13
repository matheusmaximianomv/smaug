import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type TabItem, Tabs } from "./Tabs";

const TABS: TabItem[] = [
  { id: "avulsas", label: "Avulsas", count: 3 },
  { id: "fixas", label: "Fixas", count: 1 },
];

describe("Tabs", () => {
  it("expõe um tablist e um tab por item", () => {
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={vi.fn()} />);

    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("marca a aba ativa com aria-selected", () => {
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: /Avulsas/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Fixas/ })).toHaveAttribute("aria-selected", "false");
  });

  it("chama onValueChange ao clicar em outra aba", async () => {
    const onValueChange = vi.fn();
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={onValueChange} />);

    await userEvent.click(screen.getByRole("tab", { name: /Fixas/ }));

    expect(onValueChange).toHaveBeenCalledWith("fixas");
  });

  it("navega entre abas com as setas do teclado", async () => {
    const onValueChange = vi.fn();
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={onValueChange} />);

    screen.getByRole("tab", { name: /Avulsas/ }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(onValueChange).toHaveBeenCalledWith("fixas");
  });

  it("renderiza o badge de count", () => {
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={vi.fn()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renderiza o badge quando count é 0 (a checagem é != null, não falsy)", () => {
    render(
      <Tabs tabs={[{ id: "a", label: "Avulsas", count: 0 }]} value="a" onValueChange={vi.fn()} />,
    );

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("não renderiza badge quando count é undefined", () => {
    render(<Tabs tabs={[{ id: "a", label: "Avulsas" }]} value="a" onValueChange={vi.fn()} />);

    expect(screen.getByRole("tab")).toHaveTextContent(/^Avulsas$/);
  });

  it("mescla o className na lista de abas", () => {
    render(<Tabs tabs={TABS} value="avulsas" onValueChange={vi.fn()} className="mt-4" />);

    expect(screen.getByRole("tablist")).toHaveClass("mt-4", "flex");
  });
});
