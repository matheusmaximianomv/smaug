import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CreateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/create-one-time-expense.use-case";
import type { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
  OneTimeExpensePastCompetenceCreateError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("CreateOneTimeExpenseUseCase", () => {
  let expenseRepository: { [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn> };
  let categoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: CreateOneTimeExpenseUseCase;

  const input = {
    userId: "user-1",
    categoryId: "category-1",
    description: "Jantar",
    amount: 150,
    competenceMonth: 4,
    competenceYear: 2026,
  };

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
    useCase = new CreateOneTimeExpenseUseCase(
      expenseRepository as unknown as OneTimeExpenseRepository,
      categoryRepository as unknown as ExpenseCategoryRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create one-time expense when data is valid", async () => {
    const category = ExpenseCategory.create({ id: input.categoryId, userId: input.userId, name: "Food" });
    const createdExpense = OneTimeExpense.create({ ...input, id: "expense-1" });

    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (expenseRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdExpense);

    const result = await useCase.execute(input);

    expect(categoryRepository.findById).toHaveBeenCalledWith(input.categoryId);
    expect(expenseRepository.create).toHaveBeenCalledWith(expect.any(OneTimeExpense));
    expect(result).toEqual(createdExpense);
  });

  it("should throw error when category does not belong to user", async () => {
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(expenseRepository.create).not.toHaveBeenCalled();
  });

  it("should throw error when category belongs to another user", async () => {
    const foreignCategory = ExpenseCategory.create({ id: input.categoryId, userId: "other-user", name: "Pets" });
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(foreignCategory);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(expenseRepository.create).not.toHaveBeenCalled();
  });

  it("should throw error when competence is in the past", async () => {
    const category = ExpenseCategory.create({ id: input.categoryId, userId: input.userId, name: "Food" });
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);

    await expect(
      useCase.execute({ ...input, competenceMonth: 2, competenceYear: 2026 }),
    ).rejects.toThrow(OneTimeExpensePastCompetenceCreateError);
    expect(expenseRepository.create).not.toHaveBeenCalled();
  });
});
