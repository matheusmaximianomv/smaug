import { describe, it, expect, beforeEach, vi } from "vitest";
import { OneTimeExpenseService } from "@src/application/services/one-time-expense.service";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import type { CreateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/create-one-time-expense.use-case";
import type { ListOneTimeExpensesUseCase } from "@src/domain/use-cases/one-time-expense/list-one-time-expenses.use-case";
import type { UpdateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/update-one-time-expense.use-case";
import type { DeleteOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/delete-one-time-expense.use-case";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

describe("OneTimeExpenseService data integrity guards", () => {
  const categoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLinkedExpenses: vi.fn(),
  };
  const createUseCase = { execute: vi.fn() };
  const listUseCase = { execute: vi.fn() };
  const updateUseCase = { execute: vi.fn() };
  const deleteUseCase = { execute: vi.fn() };

  const service = new OneTimeExpenseService(
    categoryRepository as unknown as ExpenseCategoryRepository,
    createUseCase as unknown as CreateOneTimeExpenseUseCase,
    listUseCase as unknown as ListOneTimeExpensesUseCase,
    updateUseCase as unknown as UpdateOneTimeExpenseUseCase,
    deleteUseCase as unknown as DeleteOneTimeExpenseUseCase,
  );

  const expense = OneTimeExpense.create({
    id: "expense-1",
    userId: "user-1",
    categoryId: "category-1",
    description: "Jantar",
    amount: 150,
    competenceMonth: 3,
    competenceYear: 2026,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail when the created expense points to a missing category", async () => {
    createUseCase.execute.mockResolvedValue(expense);
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.create("user-1", {} as never)).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should fail when the created expense points to another user's category", async () => {
    createUseCase.execute.mockResolvedValue(expense);
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-2", name: "Lazer" }),
    );

    await expect(service.create("user-1", {} as never)).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should fail listing when a referenced category is missing", async () => {
    listUseCase.execute.mockResolvedValue([expense]);
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.list("user-1", {} as never)).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should fail listing when a referenced category belongs to another user", async () => {
    listUseCase.execute.mockResolvedValue([expense]);
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-2", name: "Lazer" }),
    );

    await expect(service.list("user-1", {} as never)).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });
});
