import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeleteExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/delete-expense-category.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import {
  ExpenseCategoryHasLinkedExpensesError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

describe("DeleteExpenseCategoryUseCase", () => {
  const repository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasLinkedExpenses: vi.fn(),
  };

  const useCase = new DeleteExpenseCategoryUseCase(repository);

  const category = ExpenseCategory.create({ id: "cat-1", userId: "user-1", name: "Transporte" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete category when it belongs to user and has no linked expenses", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (repository.hasLinkedExpenses as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await useCase.execute({ id: "cat-1", userId: "user-1" });

    expect(repository.hasLinkedExpenses).toHaveBeenCalledWith("cat-1");
    expect(repository.delete).toHaveBeenCalledWith("cat-1");
  });

  it("should throw error when category does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw error when category belongs to a different user", async () => {
    const otherUserCategory = ExpenseCategory.create({ id: "cat-1", userId: "user-2", name: "Saúde" });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserCategory);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw error when category has linked expenses", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (repository.hasLinkedExpenses as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1" })).rejects.toThrow(
      ExpenseCategoryHasLinkedExpensesError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
