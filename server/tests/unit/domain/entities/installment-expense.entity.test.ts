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

    const updated = expense.updateDetails({
      description: "Notebook novo",
      categoryId: "category-2",
    });

    expect(updated.description).toBe("Notebook novo");
    expect(updated.categoryId).toBe("category-2");
    expect(updated.totalAmount).toBe(expense.totalAmount);
    expect(updated.installmentCount).toBe(expense.installmentCount);
    expect(updated.startMonth).toBe(expense.startMonth);
    expect(updated.startYear).toBe(expense.startYear);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(expense.updatedAt.getTime());
  });
});

describe("InstallmentExpense validation guards", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const props = {
    userId: "user-1",
    categoryId: "category-1",
    description: "Notebook",
    totalAmount: 1000,
    installmentCount: 3,
    startMonth: 3,
    startYear: 2026,
  };

  it("should throw for an empty description", () => {
    expect(() => InstallmentExpense.create({ ...props, description: "   " })).toThrow(
      "Description must be between 1 and 255 characters",
    );
  });

  it("should throw for a description longer than 255 characters", () => {
    expect(() => InstallmentExpense.create({ ...props, description: "a".repeat(256) })).toThrow(
      "Description must be between 1 and 255 characters",
    );
  });

  it("should throw for a non-positive total amount", () => {
    expect(() => InstallmentExpense.create({ ...props, totalAmount: 0 })).toThrow(
      "Total amount must be greater than 0",
    );
  });

  it("should throw for a non-integer installment count", () => {
    expect(() => InstallmentExpense.create({ ...props, installmentCount: 2.5 })).toThrow(
      "Installment count must be an integer",
    );
  });
});

// Espelhados em web/shared/lib/preview.test.ts (splitInstallments): a prévia da
// Revisão precisa dividir exatamente como o servidor grava.
describe("InstallmentExpense cents split (mirrored by the web preview)", () => {
  const build = (totalAmount: number, installmentCount: number) =>
    InstallmentExpense.create({
      userId: "user-1",
      categoryId: "category-1",
      description: "Compra",
      totalAmount,
      installmentCount,
      startMonth: 1,
      startYear: 2030,
    })
      .calculateInstallments()
      .map((installment) => installment.amount);

  it.each([
    [100, 3, [33.34, 33.33, 33.33]],
    [0.1, 3, [0.04, 0.03, 0.03]],
    [4800, 12, Array(12).fill(400)],
  ])("should split %s into %s installments as %j", (total, count, expected) => {
    expect(build(total, count)).toEqual(expected);
  });

  it("should split 1.00 into 72 installments putting the remainder on the first", () => {
    const amounts = build(1, 72);
    expect(amounts).toHaveLength(72);
    expect(amounts[0]).toBe(0.29);
    expect(amounts.slice(1).every((amount) => amount === 0.01)).toBe(true);
  });
});

describe("InstallmentExpense rule predicates", () => {
  const ref = new Date("2026-04-15T12:00:00.000Z");
  const startingIn = (startMonth: number, startYear = 2026, installmentCount = 3) =>
    InstallmentExpense.create({
      userId: "user-1",
      categoryId: "category-1",
      description: "Notebook",
      totalAmount: 100,
      installmentCount,
      startMonth,
      startYear,
    });

  it("should compute the end competence as start + count - 1, crossing the year", () => {
    expect(startingIn(6, 2026, 12).getEndCompetence().toString()).toBe("2027-05");
    expect(startingIn(6, 2026, 1).getEndCompetence().toString()).toBe("2026-06");
  });

  it("should report past and future installments relative to the reference", () => {
    const running = startingIn(3).calculateInstallments();

    expect(running.map((installment) => installment.statusAt(ref))).toEqual([
      "PAST",
      "CURRENT",
      "FUTURE",
    ]);
    expect(InstallmentExpense.hasPastInstallments(running, ref)).toBe(true);
    expect(InstallmentExpense.hasFutureInstallments(running, ref)).toBe(true);
  });

  it("should report no past installments when the plan starts now or later", () => {
    const upcoming = startingIn(4).calculateInstallments();

    expect(InstallmentExpense.hasPastInstallments(upcoming, ref)).toBe(false);
    expect(InstallmentExpense.hasFutureInstallments(upcoming, ref)).toBe(true);
  });

  it("should report no future installments on the last one or after termination", () => {
    const lastOne = startingIn(2).calculateInstallments();
    const terminated = startingIn(3).calculateInstallments().slice(0, 2);

    expect(InstallmentExpense.hasFutureInstallments(lastOne, ref)).toBe(false);
    expect(InstallmentExpense.hasFutureInstallments(terminated, ref)).toBe(false);
  });

  it("should default the reference to the system clock", () => {
    const installments = startingIn(1, 2000).calculateInstallments();

    expect(InstallmentExpense.hasPastInstallments(installments)).toBe(true);
    expect(InstallmentExpense.hasFutureInstallments(installments)).toBe(false);
    expect(installments[0].statusAt()).toBe("PAST");
  });
});
