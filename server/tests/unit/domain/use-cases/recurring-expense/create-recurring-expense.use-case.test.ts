import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CreateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/create-recurring-expense.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("CreateRecurringExpenseUseCase", () => {
  let recurringExpenseRepository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let expenseCategoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: CreateRecurringExpenseUseCase;

  const input = {
    userId: "user-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: 2000,
    startMonth: 4,
    startYear: 2026,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    recurringExpenseRepository = {
      findById: vi.fn(),
      findByIdWithVersions: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      terminate: vi.fn(),
      delete: vi.fn(),
      addVersion: vi.fn(),
      findVersions: vi.fn(),
      findVersionForMonth: vi.fn(),
      findActiveForCompetence: vi.fn(),
    };

    expenseCategoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasLinkedExpenses: vi.fn(),
    };

    useCase = new CreateRecurringExpenseUseCase(
      recurringExpenseRepository as unknown as RecurringExpenseRepository,
      expenseCategoryRepository as unknown as ExpenseCategoryRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create recurring expense and initial version when data is valid", async () => {
    const category = ExpenseCategory.create({ id: input.categoryId, userId: input.userId, name: "Moradia" });
    const expense = RecurringExpense.create({
      userId: input.userId,
      startMonth: input.startMonth,
      startYear: input.startYear,
    });
    const version = RecurringExpenseVersion.create({
      recurringExpenseId: expense.id,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      effectiveMonth: input.startMonth,
      effectiveYear: input.startYear,
    });

    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (recurringExpenseRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (recurringExpenseRepository.findVersions as ReturnType<typeof vi.fn>).mockResolvedValue([version]);

    const result = await useCase.execute(input);

    expect(expenseCategoryRepository.findById).toHaveBeenCalledWith(input.categoryId);
    expect(recurringExpenseRepository.create).toHaveBeenCalledWith(expect.any(RecurringExpense), expect.any(RecurringExpenseVersion));
    expect(recurringExpenseRepository.findVersions).toHaveBeenCalledWith(expense.id);
    expect(result.expense).toEqual(expense);
    expect(result.versions).toEqual([version]);
  });

  it("should throw ExpenseCategoryNotFoundError when category is invalid", async () => {
    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(recurringExpenseRepository.create).not.toHaveBeenCalled();
  });

  it("should throw ExpenseCategoryNotFoundError when category belongs to another user", async () => {
    const foreignCategory = ExpenseCategory.create({ id: input.categoryId, userId: "other-user", name: "Outros" });
    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(foreignCategory);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(recurringExpenseRepository.create).not.toHaveBeenCalled();
  });
});
