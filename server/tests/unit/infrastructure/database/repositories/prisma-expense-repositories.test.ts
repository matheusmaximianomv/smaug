import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaOneTimeExpenseRepository } from "@src/infrastructure/database/repositories/prisma-one-time-expense.repository";
import { PrismaInstallmentExpenseRepository } from "@src/infrastructure/database/repositories/prisma-installment-expense.repository";
import { PrismaRecurringExpenseRepository } from "@src/infrastructure/database/repositories/prisma-recurring-expense.repository";
import { PrismaExpenseCategoryRepository } from "@src/infrastructure/database/repositories/prisma-expense-category.repository";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";

const TIMESTAMP = new Date("2026-03-01T00:00:00.000Z");

describe("PrismaOneTimeExpenseRepository", () => {
  const oneTimeExpense = { findUnique: vi.fn(), findMany: vi.fn() };
  const repository = new PrismaOneTimeExpenseRepository({
    oneTimeExpense,
  } as unknown as PrismaClient);

  const record = {
    id: "expense-1",
    userId: "user-1",
    categoryId: "category-1",
    description: "Jantar",
    amount: 150,
    competenceMonth: 3,
    competenceYear: 2026,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when the expense does not exist", async () => {
    oneTimeExpense.findUnique.mockResolvedValue(null);

    await expect(repository.findById("expense-1")).resolves.toBeNull();
  });

  it("should list the expenses of a category ordered by competence", async () => {
    oneTimeExpense.findMany.mockResolvedValue([record]);

    const result = await repository.findByCategoryId("category-1");

    expect(oneTimeExpense.findMany).toHaveBeenCalledWith({
      where: { categoryId: "category-1" },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }],
    });
    expect(result[0]).toBeInstanceOf(OneTimeExpense);
  });
});

describe("PrismaExpenseCategoryRepository", () => {
  const expenseCategory = { findUnique: vi.fn() };
  const repository = new PrismaExpenseCategoryRepository({
    expenseCategory,
  } as unknown as PrismaClient);

  it("should return null when the category does not exist", async () => {
    expenseCategory.findUnique.mockResolvedValue(null);

    await expect(repository.findById("category-1")).resolves.toBeNull();
  });
});

describe("PrismaInstallmentExpenseRepository", () => {
  const installmentExpense = { findMany: vi.fn() };
  const installment = { update: vi.fn((args) => args) };
  const $transaction = vi.fn();
  const repository = new PrismaInstallmentExpenseRepository({
    installmentExpense,
    installment,
    $transaction,
  } as unknown as PrismaClient);

  const record = {
    id: "expense-1",
    userId: "user-1",
    categoryId: "category-1",
    description: "Notebook",
    totalAmount: 1000,
    installmentCount: 2,
    startMonth: 3,
    startYear: 2026,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should list the expenses of a category ordered by start competence", async () => {
    installmentExpense.findMany.mockResolvedValue([record]);

    const result = await repository.findByCategoryId("category-1");

    expect(installmentExpense.findMany).toHaveBeenCalledWith({
      where: { categoryId: "category-1" },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }],
    });
    expect(result[0]).toBeInstanceOf(InstallmentExpense);
  });

  it("should update every installment inside a single transaction", async () => {
    const installments = [
      Installment.create({
        id: "installment-1",
        installmentExpenseId: "expense-1",
        installmentNumber: 1,
        amount: 500,
        competenceMonth: 3,
        competenceYear: 2026,
      }),
      Installment.create({
        id: "installment-2",
        installmentExpenseId: "expense-1",
        installmentNumber: 2,
        amount: 500,
        competenceMonth: 4,
        competenceYear: 2026,
      }),
    ];

    await repository.updateInstallments(installments);

    expect(installment.update).toHaveBeenCalledTimes(2);
    expect(installment.update).toHaveBeenNthCalledWith(1, {
      where: { id: "installment-1" },
      data: { amount: 500, competenceMonth: 3, competenceYear: 2026 },
    });
    expect($transaction).toHaveBeenCalledWith(expect.arrayContaining([expect.anything()]));
  });
});

describe("PrismaRecurringExpenseRepository", () => {
  const recurringExpense = { findUnique: vi.fn(), update: vi.fn() };
  const recurringExpenseVersion = { findMany: vi.fn() };
  const repository = new PrismaRecurringExpenseRepository({
    recurringExpense,
    recurringExpenseVersion,
  } as unknown as PrismaClient);

  const record = {
    id: "recurring-1",
    userId: "user-1",
    startMonth: 3,
    startYear: 2026,
    endMonth: null,
    endYear: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when the expense does not exist", async () => {
    recurringExpense.findUnique.mockResolvedValue(null);

    await expect(repository.findById("recurring-1")).resolves.toBeNull();
  });

  it("should return null when loading versions of a missing expense", async () => {
    recurringExpense.findUnique.mockResolvedValue(null);

    await expect(repository.findByIdWithVersions("recurring-1")).resolves.toBeNull();
  });

  it("should persist only the end competence on update", async () => {
    const expense = RecurringExpense.rehydrate({ ...record, endMonth: 8, endYear: 2026 });
    recurringExpense.update.mockResolvedValue({ ...record, endMonth: 8, endYear: 2026 });

    const result = await repository.update(expense);

    expect(recurringExpense.update).toHaveBeenCalledWith({
      where: { id: "recurring-1" },
      data: { endMonth: 8, endYear: 2026, updatedAt: TIMESTAMP },
    });
    expect(result.endMonth).toBe(8);
  });

  it("should return null when no version is in effect for the month", async () => {
    recurringExpenseVersion.findMany.mockResolvedValue([]);

    await expect(repository.findVersionForMonth("recurring-1", 2026, 3)).resolves.toBeNull();
  });
});
