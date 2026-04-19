import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/get-expense-category.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

describe("GetExpenseCategoryUseCase", () => {
  const repository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasLinkedExpenses: vi.fn(),
  };

  const useCase = new GetExpenseCategoryUseCase(repository);

  const category = ExpenseCategory.create({ id: "cat-1", userId: "user-1", name: "Transporte" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return category when it belongs to the user", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);

    const result = await useCase.execute({ id: "cat-1", userId: "user-1" });

    expect(repository.findById).toHaveBeenCalledWith("cat-1");
    expect(result).toEqual(category);
  });

  it("should throw error when category is not found", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should throw error when category belongs to a different user", async () => {
    const otherUserCategory = ExpenseCategory.create({ id: "cat-1", userId: "user-2", name: "Saúde" });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserCategory);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });
});
