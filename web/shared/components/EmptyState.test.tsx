import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("exibe a mensagem", () => {
    render(<EmptyState message="Nenhuma categoria cadastrada." />);

    expect(screen.getByText("Nenhuma categoria cadastrada.")).toBeInTheDocument();
  });

  it("renderiza o ícone quando informado", () => {
    render(<EmptyState icon={<span data-testid="icone" />} message="Vazio." />);

    expect(screen.getByTestId("icone")).toBeInTheDocument();
  });

  it("não renderiza container de ícone quando nenhum é informado", () => {
    const { container } = render(<EmptyState message="Vazio." />);

    expect(container.querySelectorAll("div")).toHaveLength(1);
  });

  it("renderiza o botão da action e dispara onClick", async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        message="Nenhuma categoria cadastrada."
        action={{ label: "+ Criar primeira categoria", onClick }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "+ Criar primeira categoria" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não renderiza botão sem action", () => {
    render(<EmptyState message="Nenhuma categoria cadastrada." />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
