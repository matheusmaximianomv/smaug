import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InstallmentExpenseService } from "@src/application/services/installment-expense.service";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import type { CreateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/create-installment-expense.use-case";
import type { GetInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/get-installment-expense.use-case";
import type { ListInstallmentExpensesUseCase } from "@src/domain/use-cases/installment-expense/list-installment-expenses.use-case";
import type { UpdateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/update-installment-expense.use-case";
import type { TerminateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/terminate-installment-expense.use-case";
import type { DeleteInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/delete-installment-expense.use-case";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("InstallmentExpenseService data integrity guards", () => {
  const categoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLinkedExpenses: vi.fn(),
  };
  const installmentExpenseRepository = {
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
  const listUseCase = { execute: vi.fn() };
  const getUseCase = { execute: vi.fn() };

  const service = new InstallmentExpenseService(
    categoryRepository as unknown as ExpenseCategoryRepository,
    installmentExpenseRepository as unknown as InstallmentExpenseRepository,
    listUseCase as unknown as ListInstallmentExpensesUseCase,
    { execute: vi.fn() } as unknown as CreateInstallmentExpenseUseCase,
    getUseCase as unknown as GetInstallmentExpenseUseCase,
    { execute: vi.fn() } as unknown as UpdateInstallmentExpenseUseCase,
    { execute: vi.fn() } as unknown as TerminateInstallmentExpenseUseCase,
    { execute: vi.fn() } as unknown as DeleteInstallmentExpenseUseCase,
  );

  let expense: InstallmentExpense;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    expense = InstallmentExpense.create({
      id: "expense-1",
      userId: "user-1",
      categoryId: "category-1",
      description: "Notebook",
      totalAmount: 1000,
      installmentCount: 2,
      startMonth: 3,
      startYear: 2026,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should fail when the expense points to a missing category", async () => {
    getUseCase.execute.mockResolvedValue({ expense, installments: [] });
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.get("user-1", "expense-1")).rejects.toThrow(ExpenseCategoryNotFoundError);
  });

  it("should fail when the expense points to another user's category", async () => {
    getUseCase.execute.mockResolvedValue({ expense, installments: [] });
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-2", name: "Eletrônicos" }),
    );

    await expect(service.get("user-1", "expense-1")).rejects.toThrow(ExpenseCategoryNotFoundError);
  });

  it("should fail listing when a referenced category is missing", async () => {
    listUseCase.execute.mockResolvedValue([expense]);
    installmentExpenseRepository.findInstallmentsByExpense.mockResolvedValue([]);
    categoryRepository.findById.mockResolvedValue(null);

    await expect(service.list("user-1")).rejects.toThrow(ExpenseCategoryNotFoundError);
  });

  it("should fail listing when a referenced category belongs to another user", async () => {
    listUseCase.execute.mockResolvedValue([expense]);
    installmentExpenseRepository.findInstallmentsByExpense.mockResolvedValue([]);
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-2", name: "Eletrônicos" }),
    );

    await expect(service.list("user-1")).rejects.toThrow(ExpenseCategoryNotFoundError);
  });

  it("should fall back to an empty installment list when none is mapped for the expense", async () => {
    listUseCase.execute.mockResolvedValue([expense]);
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-1", userId: "user-1", name: "Eletrônicos" }),
    );
    // `loadInstallments` sempre devolve uma entrada por despesa; o fallback `?? []`
    // só é alcançável simulando um mapa incompleto.
    const loadInstallments = vi
      .spyOn(
        InstallmentExpenseService.prototype as unknown as {
          loadInstallments: () => Promise<Map<string, never[]>>;
        },
        "loadInstallments",
      )
      .mockResolvedValue(new Map());

    const result = await service.list("user-1");

    expect(result[0].installments).toEqual([]);
    loadInstallments.mockRestore();
  });
});
