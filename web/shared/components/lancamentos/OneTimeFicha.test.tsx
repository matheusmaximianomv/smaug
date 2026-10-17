import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OneTimeFicha } from "./OneTimeFicha";

function setup(isPast: boolean) {
  const handlers = { onClose: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn() };
  render(
    <OneTimeFicha
      tone="revenue"
      title="Freelance"
      subtitle={[]}
      competence={{ year: 2026, month: 11 }}
      amount={800}
      facts={[
        { label: "Competência", value: "Novembro 2026" },
        { label: "Situação", value: "Prevista" },
      ]}
      isPast={isPast}
      confirm={{ title: "Remover receita?", message: 'Excluir "Freelance"?' }}
      isPending={false}
      {...handlers}
    />,
  );
  return handlers;
}

const ficha = () => screen.getByRole("dialog", { name: "Freelance" });

describe("OneTimeFicha de mês corrente ou futuro", () => {
  it("mostra fatos, o mês marcado no ano, a nota e Remover/Editar", async () => {
    const handlers = setup(false);

    expect(within(ficha()).getByText("competência Nov/26")).toBeInTheDocument();
    expect(within(ficha()).getByText("Prevista")).toBeInTheDocument();
    const year = within(ficha()).getByRole("list", { name: "No ano de 2026" });
    expect(within(year).getAllByRole("listitem")).toHaveLength(12);
    expect(within(year).getByText("800,00")).toBeInTheDocument();
    expect(
      within(ficha()).getByText("Avulsa: acontece uma única vez, só nesta competência."),
    ).toBeInTheDocument();

    await userEvent.click(within(ficha()).getByRole("button", { name: "Editar" }));
    expect(handlers.onEdit).toHaveBeenCalled();
  });

  it("pede confirmação antes de remover e o Cancelar mantém a Ficha", async () => {
    const handlers = setup(false);

    await userEvent.click(within(ficha()).getByRole("button", { name: "Remover" }));
    const confirm = screen.getByRole("dialog", { name: "Remover receita?" });
    await userEvent.click(within(confirm).getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("dialog", { name: "Remover receita?" })).toBeNull();

    await userEvent.click(within(ficha()).getByRole("button", { name: "Remover" }));
    await userEvent.click(
      within(screen.getByRole("dialog", { name: "Remover receita?" })).getByRole("button", {
        name: "Remover",
      }),
    );
    expect(handlers.onRemove).toHaveBeenCalled();
  });
});

describe("OneTimeFicha de mês passado", () => {
  it("não oferece Editar nem Remover, só Fechar com a nota", async () => {
    const handlers = setup(true);

    expect(within(ficha()).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(ficha()).queryByRole("button", { name: "Remover" })).toBeNull();
    expect(
      within(ficha()).getByText("Competências passadas não podem ser alteradas."),
    ).toBeInTheDocument();

    await userEvent.click(within(ficha()).getAllByRole("button", { name: "Fechar" }).at(-1)!);
    expect(handlers.onClose).toHaveBeenCalled();
  });
});
