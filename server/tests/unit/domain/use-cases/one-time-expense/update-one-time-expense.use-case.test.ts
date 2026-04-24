import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UpdateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/update-one-time-expense.use-case";
import type { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { OneTimeExpense, type OneTimeExpenseProps } from "@src/domain/entities/one-time-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
  OneTimeExpenseNotFoundError,
  OneTimeExpensePastCompetenceEditError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

const BASE_EXPENSE_PROPS: OneTimeExpenseProps = {
  id: "expense-1",
  userId: "user-1",
  categoryId: "category-1",
  description: "Jantar",
  amount: 150,
  competenceYear: 2026,
  competenceMonth: 4,
};

type OneTimeExpenseRepositoryMock = {
  [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn>;
};

type ExpenseCategoryRepositoryMock = {
  [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn>;
};

describe("UpdateOneTimeExpenseUseCase", () => {
  let expenseRepository: OneTimeExpenseRepositoryMock;
  let categoryRepository: ExpenseCategoryRepositoryMock;
  let useCase: UpdateOneTimeExpenseUseCase;
  let existingExpense: OneTimeExpense;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    expenseRepository = {
      findById: vi.fn(),
      findAllByUser: vi.fn(),
      findByUserAndCompetence: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    categoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasLinkedExpenses: vi.fn(),
    };

    useCase = new UpdateOneTimeExpenseUseCase(
      expenseRepository as unknown as OneTimeExpenseRepository,
      categoryRepository as unknown as ExpenseCategoryRepository,
    );

    existingExpense = OneTimeExpense.create(BASE_EXPENSE_PROPS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should update expense when data is valid", async () => {
    const newCategory = ExpenseCategory.create({ id: "category-2", userId: "user-1", name: "Transporte" });
    const updatedExpense = OneTimeExpense.create({ ...BASE_EXPENSE_PROPS, categoryId: "category-2", amount: 200 });

    (expenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existingExpense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(newCategory);
    (expenseRepository.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedExpense);

    const result = await useCase.execute({
      id: existingExpense.id,
      userId: "user-1",
      categoryId: "category-2",
      amount: 200,
    });

    expect(categoryRepository.findById).toHaveBeenCalledWith("category-2");
    expect(expenseRepository.update).toHaveBeenCalledWith(expect.any(OneTimeExpense));
    expect(result).toEqual(updatedExpense);
  });

  it("should throw OneTimeExpenseNotFoundError when expense does not exist", async () => {
    (expenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ id: "missing", userId: "user-1", description: "Updated" }),
    ).rejects.toThrow(OneTimeExpenseNotFoundError);
  });

  it("should throw OneTimeExpenseNotFoundError when expense belongs to another user", async () => {
    const otherUserExpense = OneTimeExpense.create({ ...BASE_EXPENSE_PROPS, userId: "user-2" });
    (expenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(
      useCase.execute({ id: otherUserExpense.id, userId: "user-1", description: "Updated" }),
    ).rejects.toThrow(OneTimeExpenseNotFoundError);
  });

  it("should throw ExpenseCategoryNotFoundError when new category is invalid", async () => {
    (expenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(existingExpense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: existingExpense.id,
        userId: "user-1",
        categoryId: "invalid-category",
      }),
    ).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(expenseRepository.update).not.toHaveBeenCalled();
  });

  it("should throw OneTimeExpensePastCompetenceEditError when competence is in the past", async () => {
    const pastExpense = OneTimeExpense.create({ ...BASE_EXPENSE_PROPS, competenceMonth: 2 });
    (expenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(pastExpense);

    await expect(
      useCase.execute({ id: pastExpense.id, userId: "user-1", description: "Updated" }),
    ).rejects.toThrow(OneTimeExpensePastCompetenceEditError);
    expect(expenseRepository.update).not.toHaveBeenCalled();
  });
});
