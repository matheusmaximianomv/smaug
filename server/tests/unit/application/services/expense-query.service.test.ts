import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExpenseQueryService } from "@src/application/services/expense-query.service";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import type { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

describe("ExpenseQueryService", () => {
  let categoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let oneTimeExpenseRepository: { [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn> };
  let installmentExpenseRepository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let recurringExpenseRepository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let service: ExpenseQueryService;

  const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    categoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasLinkedExpenses: vi.fn(),
    } as unknown as { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };

    oneTimeExpenseRepository = {
      findById: vi.fn(),
      findAllByUser: vi.fn(),
      findByUserAndCompetence: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as { [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn> };

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
    } as unknown as { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };

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
    } as unknown as { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };

    service = new ExpenseQueryService(
      categoryRepository as unknown as ExpenseCategoryRepository,
      oneTimeExpenseRepository as unknown as OneTimeExpenseRepository,
      installmentExpenseRepository as unknown as InstallmentExpenseRepository,
      recurringExpenseRepository as unknown as RecurringExpenseRepository,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should return consolidated expenses when all types exist", async () => {
    const categoryFood = ExpenseCategory.create({ id: "cat-food", userId: "user-1", name: "Alimentação" });
    const categoryHome = ExpenseCategory.create({ id: "cat-home", userId: "user-1", name: "Moradia" });

    const oneTimeExpense = OneTimeExpense.create({
      id: "one-time-1",
      userId: "user-1",
      categoryId: categoryFood.id,
      description: "Jantar",
      amount: 150,
      competenceYear: 2026,
      competenceMonth: 3,
    });

    const installmentExpense = InstallmentExpense.create({
      id: "installment-1",
      userId: "user-1",
      categoryId: categoryFood.id,
      description: "Notebook",
      totalAmount: 1000,
      installmentCount: 3,
      startYear: 2026,
      startMonth: 3,
    });
    const installment = Installment.create({
      id: "install-1",
      installmentExpenseId: installmentExpense.id,
      installmentNumber: 1,
      amount: 333.34,
      competenceYear: 2026,
      competenceMonth: 3,
    });

    const recurringExpense = RecurringExpense.create({
      id: "recurring-1",
      userId: "user-1",
      startYear: 2026,
      startMonth: 3,
    });
    const recurringVersion = RecurringExpenseVersion.create({
      id: "recurring-version-1",
      recurringExpenseId: recurringExpense.id,
      categoryId: categoryHome.id,
      description: "Aluguel",
      amount: 2000,
      effectiveYear: 2026,
      effectiveMonth: 3,
    });

    (oneTimeExpenseRepository.findByUserAndCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([oneTimeExpense]);
    (installmentExpenseRepository.findInstallmentsByCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([installment]);
    (installmentExpenseRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(installmentExpense);
    (recurringExpenseRepository.findActiveForCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([recurringExpense]);
    (recurringExpenseRepository.findVersionForMonth as ReturnType<typeof vi.fn>).mockResolvedValue(recurringVersion);
    (categoryRepository.findById as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(categoryFood)
      .mockResolvedValueOnce(categoryHome);

    const result = await service.getConsolidatedExpenses("user-1", {
      competenceYear: 2026,
      competenceMonth: 3,
    });

    expect(result.expenses).toHaveLength(3);
    expect(result.totals.oneTime).toBe(150);
    expect(result.totals.installment).toBe(333.34);
    expect(result.totals.recurring).toBe(2000);
    expect(result.totals.total).toBe(2483.34);

    const oneTimeResult = result.expenses.find((expense) => expense.type === "ONE_TIME")!;
    expect(oneTimeResult.category.name).toBe("Alimentação");

    const installmentResult = result.expenses.find((expense) => expense.type === "INSTALLMENT")!;
    expect(installmentResult.installmentNumber).toBe(1);
    expect(installmentResult.totalAmount).toBe(1000);

    const recurringResult = result.expenses.find((expense) => expense.type === "RECURRING")!;
    expect(recurringResult.description).toBe("Aluguel");
    expect(recurringResult.category.name).toBe("Moradia");
  });

  it("should throw ExpenseCategoryNotFoundError when category is missing", async () => {
    (oneTimeExpenseRepository.findByUserAndCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (installmentExpenseRepository.findInstallmentsByCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (recurringExpenseRepository.findActiveForCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([
      RecurringExpense.create({
        id: "rec-2",
        userId: "user-1",
        startYear: 2026,
        startMonth: 3,
      }),
    ]);
    (recurringExpenseRepository.findVersionForMonth as ReturnType<typeof vi.fn>).mockResolvedValue(
      RecurringExpenseVersion.create({
        id: "rec-v-2",
        recurringExpenseId: "rec-2",
        categoryId: "missing-category",
        description: "Internet",
        amount: 120,
        effectiveYear: 2026,
        effectiveMonth: 3,
      }),
    );
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      service.getConsolidatedExpenses("user-1", { competenceYear: 2026, competenceMonth: 3 }),
    ).rejects.toBeInstanceOf(ExpenseCategoryNotFoundError);
  });
});
