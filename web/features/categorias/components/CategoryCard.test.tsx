import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { CategoryCard } from "./CategoryCard";

function renderCard(overrides = {}) {
  const category = makeCategoryWithCount({ name: "Moradia", ...overrides });
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(<CategoryCard category={category} onEdit={onEdit} onDelete={onDelete} />);
  return { category, onEdit, onDelete };
}

describe("CategoryCard", () => {
  it("exibe o nome da categoria", () => {
    renderCard();

    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it("usa a primeira letra maiúscula como avatar", () => {
    renderCard({ name: "alimentação" });

    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it.each([
    [0, "0 despesas vinculadas"],
    [1, "1 despesa vinculada"],
    [2, "2 despesas vinculadas"],
    [10, "10 despesas vinculadas"],
  ])("pluraliza %i como %s", (count, text) => {
    renderCard({ linkedExpensesCount: count });

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("chama onEdit com a categoria", async () => {
    const { category, onEdit } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Editar categoria" }));

    expect(onEdit).toHaveBeenCalledWith(category);
  });

  it("chama onDelete com a categoria", async () => {
    const { category, onDelete } = renderCard();

    await userEvent.click(screen.getByRole("button", { name: "Excluir categoria" }));

    expect(onDelete).toHaveBeenCalledWith(category);
  });

  it("é identificável por data-testid", () => {
    renderCard();

    expect(screen.getByTestId("category-card")).toBeInTheDocument();
  });
});
