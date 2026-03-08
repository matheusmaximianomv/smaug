import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/update-expense-category.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { ExpenseCategoryNameAlreadyExistsError, ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

describe("UpdateExpenseCategoryUseCase", () => {
  const repository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasLinkedExpenses: vi.fn(),
  };

  const useCase = new UpdateExpenseCategoryUseCase(repository);

  const category = ExpenseCategory.create({ id: "cat-1", userId: "user-1", name: "Transporte" });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should update category when new name is unique", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (repository.findByNameLower as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repository.update as ReturnType<typeof vi.fn>).mockImplementation(async (updated) => updated);

    const result = await useCase.execute({ id: "cat-1", userId: "user-1", name: "Saúde" });

    expect(repository.findById).toHaveBeenCalledWith("cat-1");
    expect(repository.findByNameLower).toHaveBeenCalledWith("user-1", "saúde");
    expect(repository.update).toHaveBeenCalled();
    expect(result.name).toBe("Saúde");
    expect(result.nameLower).toBe("saúde");
  });

  it("should throw error when category does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1", name: "Saúde" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should throw error when category belongs to a different user", async () => {
    const otherUserCategory = ExpenseCategory.create({ id: "cat-1", userId: "user-2", name: "Saúde" });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserCategory);

    await expect(useCase.execute({ id: "cat-1", userId: "user-1", name: "Saúde" })).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should throw error when new name already exists for user", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (repository.findByNameLower as ReturnType<typeof vi.fn>).mockResolvedValue(
      ExpenseCategory.create({ id: "cat-2", userId: "user-1", name: "Saúde" }),
    );

    await expect(useCase.execute({ id: "cat-1", userId: "user-1", name: "Saúde" })).rejects.toThrow(
      ExpenseCategoryNameAlreadyExistsError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});
