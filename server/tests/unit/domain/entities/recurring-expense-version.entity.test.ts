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
    expect(() => RecurringExpenseVersion.create({ ...validProps, effectiveMonth: 2 })).toThrow(
      PastEffectiveDateError,
    );
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

describe("RecurringExpenseVersion createForImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pastProps = {
    recurringExpenseId: "recurring-1",
    categoryId: "category-1",
    description: "Aluguel",
    amount: 2000,
    effectiveMonth: 1,
    effectiveYear: 2024,
  } as const;

  it("should accept an effective competence in the past, which is the point of importing history", () => {
    const version = RecurringExpenseVersion.createForImport(pastProps);

    expect(version.effectiveMonth).toBe(1);
    expect(version.effectiveYear).toBe(2024);
  });

  it("should mint an id and a timestamp like create does", () => {
    const version = RecurringExpenseVersion.createForImport(pastProps);

    expect(version.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(version.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should still trim the description", () => {
    const version = RecurringExpenseVersion.createForImport({
      ...pastProps,
      description: "  Aluguel  ",
    });

    expect(version.description).toBe("Aluguel");
  });

  it("should still reject an empty description", () => {
    expect(() =>
      RecurringExpenseVersion.createForImport({ ...pastProps, description: " " }),
    ).toThrow("Description must be between 1 and 255 characters");
  });

  it("should still reject a non-positive amount", () => {
    expect(() => RecurringExpenseVersion.createForImport({ ...pastProps, amount: 0 })).toThrow(
      "Amount must be greater than 0",
    );
  });

  it("should still reject an amount with more than two decimal places", () => {
    expect(() => RecurringExpenseVersion.createForImport({ ...pastProps, amount: 10.555 })).toThrow(
      "Amount must have at most 2 decimal places",
    );
  });
});
