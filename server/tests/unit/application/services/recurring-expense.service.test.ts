import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecurringExpenseService } from "@src/application/services/recurring-expense.service";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import type { CreateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/create-recurring-expense.use-case";
import type { GetRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/get-recurring-expense.use-case";
import type { ListRecurringExpensesUseCase } from "@src/domain/use-cases/recurring-expense/list-recurring-expenses.use-case";
import type { UpdateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/update-recurring-expense.use-case";
import type { TerminateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/terminate-recurring-expense.use-case";
import type { DeleteRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/delete-recurring-expense.use-case";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

describe("RecurringExpenseService data integrity guards", () => {
  const categoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLinkedExpenses: vi.fn(),
  };
  const recurringExpenseRepository = {
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
  const getUseCase = { execute: vi.fn() };

  const service = new RecurringExpenseService(
    categoryRepository as unknown as ExpenseCategoryRepository,
    recurringExpenseRepository as unknown as RecurringExpenseRepository,
    { execute: vi.fn() } as unknown as CreateRecurringExpenseUseCase,
    getUseCase as unknown as GetRecurringExpenseUseCase,
    { execute: vi.fn() } as unknown as ListRecurringExpensesUseCase,
    { execute: vi.fn() } as unknown as UpdateRecurringExpenseUseCase,
    { execute: vi.fn() } as unknown as TerminateRecurringExpenseUseCase,
    { execute: vi.fn() } as unknown as DeleteRecurringExpenseUseCase,
  );

  const TIMESTAMP = new Date("2026-03-01T00:00:00.000Z");

  const expense = RecurringExpense.rehydrate({
    id: "recurring-1",
    userId: "user-1",
    startMonth: 3,
    startYear: 2026,
    endMonth: null,
    endYear: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  });

  const version = RecurringExpenseVersion.rehydrate({
    id: "version-1",
    recurringExpenseId: "recurring-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: 2000,
    effectiveMonth: 3,
    effectiveYear: 2026,
    createdAt: TIMESTAMP,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    getUseCase.execute.mockResolvedValue({ expense, versions: [version] });
  });

  it("should fail when a version points to a missing category", async () => {
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.get("user-1", "recurring-1")).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });

  it("should fail when a version points to another user's category", async () => {
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-2", name: "Moradia" }),
    );

    await expect(service.get("user-1", "recurring-1")).rejects.toThrow(
      ExpenseCategoryNotFoundError,
    );
  });
});
