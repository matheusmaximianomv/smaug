import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CreateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/create-installment-expense.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
  InstallmentExpensePastStartError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";
const CATEGORY_ID = "category-1";

describe("CreateInstallmentExpenseUseCase", () => {
  let installmentExpenseRepository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let expenseCategoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: CreateInstallmentExpenseUseCase;

  const input = {
    userId: USER_ID,
    categoryId: CATEGORY_ID,
    description: "Notebook",
    totalAmount: 1000,
    installmentCount: 3,
    startMonth: 4,
    startYear: 2026,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    installmentExpenseRepository = {
      findById: vi.fn(),
      listByUser: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateInstallments: vi.fn(),
      delete: vi.fn(),
      deleteFutureInstallments: vi.fn(),
      hasPastInstallments: vi.fn(),
      findInstallmentsByExpense: vi.fn(),
      findInstallmentsByCompetence: vi.fn(),
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

    useCase = new CreateInstallmentExpenseUseCase(
      installmentExpenseRepository as unknown as InstallmentExpenseRepository,
      expenseCategoryRepository as unknown as ExpenseCategoryRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create installment expense with installments when data is valid", async () => {
    const category = ExpenseCategory.create({ id: CATEGORY_ID, userId: USER_ID, name: "Eletrônicos" });
    const createdExpense = InstallmentExpense.create({ ...input, id: "expense-1" });
    const persistedInstallments = createdExpense.calculateInstallments();

    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    (installmentExpenseRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue(createdExpense);
    (installmentExpenseRepository.findInstallmentsByExpense as ReturnType<typeof vi.fn>).mockResolvedValue(
      persistedInstallments,
    );

    const result = await useCase.execute(input);

    expect(expenseCategoryRepository.findById).toHaveBeenCalledWith(CATEGORY_ID);
    expect(installmentExpenseRepository.create).toHaveBeenCalledWith(expect.any(InstallmentExpense), expect.any(Array));
    expect(installmentExpenseRepository.findInstallmentsByExpense).toHaveBeenCalledWith(createdExpense.id);
    expect(result.expense).toEqual(createdExpense);
    expect(result.installments).toEqual(persistedInstallments);
  });

  it("should throw ExpenseCategoryNotFoundError when category is missing", async () => {
    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(installmentExpenseRepository.create).not.toHaveBeenCalled();
  });

  it("should throw ExpenseCategoryNotFoundError when category belongs to another user", async () => {
    const foreignCategory = ExpenseCategory.create({ id: CATEGORY_ID, userId: "other-user", name: "Outros" });
    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(foreignCategory);

    await expect(useCase.execute(input)).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(installmentExpenseRepository.create).not.toHaveBeenCalled();
  });

  it("should throw InstallmentExpensePastStartError when start competence is in the past", async () => {
    const category = ExpenseCategory.create({ id: CATEGORY_ID, userId: USER_ID, name: "Eletrônicos" });
    (expenseCategoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);

    await expect(useCase.execute({ ...input, startMonth: 2 })).rejects.toThrow(InstallmentExpensePastStartError);
    expect(installmentExpenseRepository.create).not.toHaveBeenCalled();
  });
});
