import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/create-expense-category.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { ExpenseCategoryNameAlreadyExistsError } from "@src/domain/errors/domain-error";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

describe("CreateExpenseCategoryUseCase", () => {
  const repository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hasLinkedExpenses: vi.fn(),
  };

  const useCase = new CreateExpenseCategoryUseCase(repository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create expense category when name is unique", async () => {
    const input = { userId: "user-1", name: "Transporte" };
    const created = ExpenseCategory.create({ ...input, id: "cat-1" });

    (repository.findByNameLower as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const result = await useCase.execute(input);

    expect(repository.findByNameLower).toHaveBeenCalledWith("user-1", "transporte");
    expect(repository.create).toHaveBeenCalledWith(expect.any(ExpenseCategory));
    expect(result).toEqual(created);
  });

  it("should throw error when category name already exists", async () => {
    const input = { userId: "user-1", name: "Transporte" };
    const existing = ExpenseCategory.create({ ...input, id: "cat-1" });

    (repository.findByNameLower as ReturnType<typeof vi.fn>).mockResolvedValue(existing);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNameAlreadyExistsError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
