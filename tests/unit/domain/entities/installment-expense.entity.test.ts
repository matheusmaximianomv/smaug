import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("InstallmentExpense", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validProps = {
    userId: "user-1",
    categoryId: "category-1",
    description: "Notebook",
    totalAmount: 1000.0,
    installmentCount: 3,
    startMonth: 3,
    startYear: 2026,
  } as const;

  it("should create installment expense when data is valid", () => {
    const expense = InstallmentExpense.create(validProps);

    expect(expense.userId).toBe(validProps.userId);
    expect(expense.categoryId).toBe(validProps.categoryId);
    expect(expense.description).toBe("Notebook");
    expect(expense.totalAmount).toBe(1000.0);
    expect(expense.installmentCount).toBe(3);
    expect(expense.startMonth).toBe(3);
    expect(expense.startYear).toBe(2026);
    expect(expense.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
    expect(expense.updatedAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should normalize description and validate length when creating", () => {
    const expense = InstallmentExpense.create({ ...validProps, description: "  Cartão " });
    expect(expense.description).toBe("Cartão");
  });

  it("should throw error when total amount has more than two decimals", () => {
    expect(() => InstallmentExpense.create({ ...validProps, totalAmount: 10.123 })).toThrow(
      "Total amount must have at most 2 decimal places",
    );
  });

  it("should throw error when installment count is outside allowed range", () => {
    expect(() => InstallmentExpense.create({ ...validProps, installmentCount: 0 })).toThrow(
      "Installment count must be between 1 and 72",
    );
    expect(() => InstallmentExpense.create({ ...validProps, installmentCount: 73 })).toThrow(
      "Installment count must be between 1 and 72",
    );
  });

  it("should generate installments using cents arithmetic when requested", () => {
    const expense = InstallmentExpense.create(validProps);

    const installments = expense.calculateInstallments();

    expect(installments).toHaveLength(3);
    expect(installments[0].amount).toBe(333.34);
    expect(installments[1].amount).toBe(333.33);
    expect(installments[2].amount).toBe(333.33);
    expect(installments[0].competenceMonth).toBe(3);
    expect(installments[0].competenceYear).toBe(2026);
    expect(installments[1].competenceMonth).toBe(4);
    expect(installments[1].competenceYear).toBe(2026);
    expect(installments[2].competenceMonth).toBe(5);
    expect(installments[2].competenceYear).toBe(2026);
  });

  it("should update description and category while keeping financial data immutable when requested", () => {
    const expense = InstallmentExpense.create(validProps);

    vi.advanceTimersByTime(1);

    const updated = expense.updateDetails({ description: "Notebook novo", categoryId: "category-2" });

    expect(updated.description).toBe("Notebook novo");
    expect(updated.categoryId).toBe("category-2");
    expect(updated.totalAmount).toBe(expense.totalAmount);
    expect(updated.installmentCount).toBe(expense.installmentCount);
    expect(updated.startMonth).toBe(expense.startMonth);
    expect(updated.startYear).toBe(expense.startYear);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(expense.updatedAt.getTime());
  });
});
