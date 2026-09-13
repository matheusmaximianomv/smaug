import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { PastEffectiveDateError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("RecurringExpenseVersion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validProps = {
    recurringExpenseId: "recurring-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: 2000,
    effectiveMonth: 4,
    effectiveYear: 2026,
  } as const;

  it("should create recurring expense version with normalized description", () => {
    const version = RecurringExpenseVersion.create({ ...validProps, description: "  Aluguel " });

    expect(version.recurringExpenseId).toBe(validProps.recurringExpenseId);
    expect(version.categoryId).toBe(validProps.categoryId);
    expect(version.description).toBe("Aluguel");
    expect(version.amount).toBe(2000);
    expect(version.effectiveMonth).toBe(4);
    expect(version.effectiveYear).toBe(2026);
    expect(version.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should throw PastEffectiveDateError when effective competence is in the past", () => {
    expect(() => RecurringExpenseVersion.create({ ...validProps, effectiveMonth: 2 })).toThrow(PastEffectiveDateError);
  });

  it("should throw error when amount has more than two decimal places", () => {
    expect(() => RecurringExpenseVersion.create({ ...validProps, amount: 10.123 })).toThrow(
      "Amount must have at most 2 decimal places",
    );
  });

  it("should throw error when description is empty", () => {
    expect(() => RecurringExpenseVersion.create({ ...validProps, description: "" })).toThrow(
      "Description must be between 1 and 255 characters",
    );
  });
});

describe("RecurringExpenseVersion rehydrate and validation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should rehydrate from persistence without running validations", () => {
    const createdAt = new Date("2020-01-01T00:00:00.000Z");

    const version = RecurringExpenseVersion.rehydrate({
      id: "version-1",
      recurringExpenseId: "recurring-1",
      categoryId: "category-1",
      description: "Aluguel",
      amount: 1500,
      effectiveMonth: 1,
      effectiveYear: 2020,
      createdAt,
    });

    expect(version.id).toBe("version-1");
    expect(version.effectiveMonth).toBe(1);
    expect(version.effectiveYear).toBe(2020);
    expect(version.createdAt).toBe(createdAt);
  });

  it("should expose the effective competence", () => {
    const competence = RecurringExpenseVersion.create({
      recurringExpenseId: "recurring-1",
      categoryId: "category-1",
      description: "Aluguel",
      amount: 1500,
      effectiveMonth: 5,
      effectiveYear: 2026,
    }).getEffectiveCompetence();

    expect(competence.month).toBe(5);
    expect(competence.year).toBe(2026);
  });

  it("should throw for a non-positive amount", () => {
    expect(() =>
      RecurringExpenseVersion.create({
        recurringExpenseId: "recurring-1",
        categoryId: "category-1",
        description: "Aluguel",
        amount: 0,
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    ).toThrow("Amount must be greater than 0");
  });
});
