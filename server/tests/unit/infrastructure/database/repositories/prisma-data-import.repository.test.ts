import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaDataImportRepository } from "@src/infrastructure/database/repositories/prisma-data-import.repository";
import { ImportPayload } from "@src/domain/ports/data-import.repository";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";

const USER_ID = "user-1";
const TIMESTAMP = new Date("2026-04-01T00:00:00.000Z");

function emptyPayload(): ImportPayload {
  return {
    categories: [],
    oneTimeRevenues: [],
    fixedRevenues: [],
    oneTimeExpenses: [],
    installmentExpenses: [],
    recurringExpenses: [],
  };
}

describe("PrismaDataImportRepository", () => {
  const tx = {
    expenseCategory: { create: vi.fn() },
    oneTimeRevenue: { create: vi.fn() },
    fixedRevenue: { create: vi.fn() },
    oneTimeExpense: { create: vi.fn() },
    installmentExpense: { create: vi.fn() },
    recurringExpense: { create: vi.fn() },
  };

  const $transaction = vi.fn(async (callback: (client: typeof tx) => Promise<void>) => {
    await callback(tx);
  });

  const repository = new PrismaDataImportRepository({ $transaction } as unknown as PrismaClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should wrap the whole batch in a single transaction", async () => {
    await repository.persist(emptyPayload());
    expect($transaction).toHaveBeenCalledTimes(1);
  });

  it("should write nothing for an empty payload", async () => {
    await repository.persist(emptyPayload());

    expect(tx.expenseCategory.create).not.toHaveBeenCalled();
    expect(tx.oneTimeRevenue.create).not.toHaveBeenCalled();
  });

  it("should create the categories the batch introduced", async () => {
    const category = ExpenseCategory.create({ userId: USER_ID, name: "Pets" });

    await repository.persist({ ...emptyPayload(), categories: [category] });

    expect(tx.expenseCategory.create).toHaveBeenCalledWith({
      data: {
        id: category.id,
        userId: USER_ID,
        name: "Pets",
        nameLower: "pets",
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
  });

  it("should create a one-time revenue", async () => {
    const revenue = OneTimeRevenue.create({
      userId: USER_ID,
      description: "Bônus",
      amount: 500,
      competenceMonth: 4,
      competenceYear: 2026,
    });

    await repository.persist({ ...emptyPayload(), oneTimeRevenues: [revenue] });

    expect(tx.oneTimeRevenue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: revenue.id, description: "Bônus", amount: 500 }),
    });
  });

  it("should create a fixed revenue together with its versions", async () => {
    const revenue = FixedRevenue.create({
      userId: USER_ID,
      modality: "ALTERABLE",
      startMonth: 1,
      startYear: 2026,
      endMonth: 3,
      endYear: 2026,
    });
    const version = FixedRevenueVersion.create({
      fixedRevenueId: revenue.id,
      description: "Salário",
      amount: 9200,
      effectiveMonth: 1,
      effectiveYear: 2026,
    });

    await repository.persist({
      ...emptyPayload(),
      fixedRevenues: [{ revenue, versions: [version] }],
    });

    const { data } = tx.fixedRevenue.create.mock.calls[0]![0];
    expect(data.id).toBe(revenue.id);
    expect(data.modality).toBe("ALTERABLE");
    expect(data.versions.create).toEqual([
      expect.objectContaining({ id: version.id, description: "Salário", amount: 9200 }),
    ]);
  });

  it("should create a one-time expense", async () => {
    const expense = OneTimeExpense.create({
      userId: USER_ID,
      categoryId: "cat-1",
      description: "Mercado",
      amount: 50,
      competenceMonth: 4,
      competenceYear: 2026,
    });

    await repository.persist({ ...emptyPayload(), oneTimeExpenses: [expense] });

    expect(tx.oneTimeExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ id: expense.id, categoryId: "cat-1" }),
    });
  });

  it("should create an installment purchase with only the installments given", async () => {
    const expense = InstallmentExpense.create({
      userId: USER_ID,
      categoryId: "cat-1",
      description: "TV",
      totalAmount: 800,
      installmentCount: 12,
      startMonth: 2,
      startYear: 2026,
    });
    const installment = Installment.create({
      installmentExpenseId: expense.id,
      installmentNumber: 3,
      amount: 400,
      competenceMonth: 4,
      competenceYear: 2026,
    });

    await repository.persist({
      ...emptyPayload(),
      installmentExpenses: [{ expense, installments: [installment] }],
    });

    const { data } = tx.installmentExpense.create.mock.calls[0]![0];
    expect(data.installmentCount).toBe(12);
    expect(data.installments.create).toHaveLength(1);
    expect(data.installments.create[0]).toEqual(
      expect.objectContaining({ installmentNumber: 3, amount: 400 }),
    );
  });

  it("should create a recurring expense together with its versions", async () => {
    const expense = RecurringExpense.rehydrate({
      id: "rec-1",
      userId: USER_ID,
      startMonth: 1,
      startYear: 2020,
      endMonth: 3,
      endYear: 2020,
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    });
    const version = RecurringExpenseVersion.rehydrate({
      id: "rec-1-v1",
      recurringExpenseId: expense.id,
      categoryId: "cat-1",
      description: "Aluguel",
      amount: 2200,
      effectiveMonth: 1,
      effectiveYear: 2020,
      createdAt: TIMESTAMP,
    });

    await repository.persist({
      ...emptyPayload(),
      recurringExpenses: [{ expense, versions: [version] }],
    });

    const { data } = tx.recurringExpense.create.mock.calls[0]![0];
    expect(data.startYear).toBe(2020);
    expect(data.versions.create[0]).toEqual(
      expect.objectContaining({ categoryId: "cat-1", description: "Aluguel" }),
    );
  });

  it("should create the categories before the expenses that reference them", async () => {
    const order: string[] = [];
    tx.expenseCategory.create.mockImplementation(async () => {
      order.push("category");
    });
    tx.oneTimeExpense.create.mockImplementation(async () => {
      order.push("expense");
    });

    const category = ExpenseCategory.create({ userId: USER_ID, name: "Pets" });
    const expense = OneTimeExpense.create({
      userId: USER_ID,
      categoryId: category.id,
      description: "Ração",
      amount: 90,
      competenceMonth: 4,
      competenceYear: 2026,
    });

    await repository.persist({
      ...emptyPayload(),
      categories: [category],
      oneTimeExpenses: [expense],
    });

    expect(order).toEqual(["category", "expense"]);
  });

  it("should let a failure abort the transaction", async () => {
    const failure = new Error("constraint");
    tx.oneTimeRevenue.create.mockRejectedValue(failure);

    const revenue = OneTimeRevenue.create({
      userId: USER_ID,
      description: "Bônus",
      amount: 500,
      competenceMonth: 4,
      competenceYear: 2026,
    });

    await expect(
      repository.persist({ ...emptyPayload(), oneTimeRevenues: [revenue] }),
    ).rejects.toThrow(failure);
  });
});
