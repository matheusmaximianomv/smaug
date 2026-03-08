import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListExpenseCategoriesUseCase } from "@src/domain/use-cases/expense-category/list-expense-categories.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

describe("ListExpenseCategoriesUseCase", () => {
  const repository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasLinkedExpenses: vi.fn(),
  };

  const useCase = new ListExpenseCategoriesUseCase(repository);

  const categories = [
    ExpenseCategory.create({ id: "cat-1", userId: "user-1", name: "Transporte" }),
    ExpenseCategory.create({ id: "cat-2", userId: "user-1", name: "Saúde" }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list categories ordered by repository implementation", async () => {
    (repository.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(categories);

    const result = await useCase.execute({ userId: "user-1" });

    expect(repository.listByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual(categories);
  });
});
