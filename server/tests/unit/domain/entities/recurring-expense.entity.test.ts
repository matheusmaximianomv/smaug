import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { PastCompetenceError, EndDateBeforeStartError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("RecurringExpense", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const validProps = {
    userId: "user-1",
    startMonth: 4,
    startYear: 2026,
  } as const;

  it("should create recurring expense when start competence is current or future", () => {
    const expense = RecurringExpense.create(validProps);

    expect(expense.userId).toBe(validProps.userId);
    expect(expense.startMonth).toBe(4);
    expect(expense.startYear).toBe(2026);
    expect(expense.endMonth).toBeNull();
    expect(expense.endYear).toBeNull();
    expect(expense.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should throw PastCompetenceError when start competence is in the past", () => {
    expect(() => RecurringExpense.create({ ...validProps, startMonth: 1 })).toThrow(
      PastCompetenceError,
    );
  });

  it("should throw EndDateBeforeStartError when end competence is before start", () => {
    expect(() => RecurringExpense.create({ ...validProps, endMonth: 2, endYear: 2026 })).toThrow(
      EndDateBeforeStartError,
    );
  });

  it("should terminate recurring expense updating end competence", () => {
    const expense = RecurringExpense.create(validProps);

    vi.advanceTimersByTime(1);

    const terminated = expense.terminate(6, 2026);

    expect(terminated.endMonth).toBe(6);
    expect(terminated.endYear).toBe(2026);
    expect(terminated.updatedAt.getTime()).toBeGreaterThan(expense.updatedAt.getTime());
  });

  it("should throw EndDateBeforeStartError when terminating before start", () => {
    const expense = RecurringExpense.create(validProps);

    expect(() => expense.terminate(2, 2026)).toThrow(EndDateBeforeStartError);
  });

  it("should report active status only within start and end competence range", () => {
    const expense = RecurringExpense.create({ ...validProps, endMonth: 6, endYear: 2026 });

    expect(expense.isActiveForMonth(3, 2026)).toBe(false);
    expect(expense.isActiveForMonth(4, 2026)).toBe(true);
    expect(expense.isActiveForMonth(6, 2026)).toBe(true);
    expect(expense.isActiveForMonth(7, 2026)).toBe(false);
  });
});

describe("RecurringExpense clearTermination and open-ended activity", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const build = () => RecurringExpense.create({ userId: "user-1", startMonth: 4, startYear: 2026 });

  it("should remove the end competence", () => {
    const terminated = build().terminate(10, 2026);
    expect(terminated.endMonth).toBe(10);

    const cleared = terminated.clearTermination();

    expect(cleared.id).toBe(terminated.id);
    expect(cleared.startMonth).toBe(terminated.startMonth);
    expect(cleared.createdAt).toBe(terminated.createdAt);
    expect(cleared.endMonth).toBeNull();
    expect(cleared.endYear).toBeNull();
  });

  it("should stay active indefinitely when there is no end competence", () => {
    expect(build().isActiveForMonth(12, 2040)).toBe(true);
  });
});

describe("RecurringExpense createForImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const pastProps = {
    userId: "user-1",
    startMonth: 1,
    startYear: 2024,
  } as const;

  it("should accept a start competence in the past, which is the point of importing history", () => {
    const expense = RecurringExpense.createForImport(pastProps);

    expect(expense.startMonth).toBe(1);
    expect(expense.startYear).toBe(2024);
  });

  it("should mint an id and timestamps like create does", () => {
    const expense = RecurringExpense.createForImport(pastProps);

    expect(expense.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(expense.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
    expect(expense.updatedAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should keep the end competence when it is on or after the start", () => {
    const expense = RecurringExpense.createForImport({
      ...pastProps,
      endMonth: 6,
      endYear: 2024,
    });

    expect(expense.endMonth).toBe(6);
    expect(expense.endYear).toBe(2024);
  });

  it("should still reject an end competence before the start", () => {
    expect(() =>
      RecurringExpense.createForImport({ ...pastProps, endMonth: 12, endYear: 2023 }),
    ).toThrow(EndDateBeforeStartError);
  });

  it("should still reject a month outside 1-12", () => {
    expect(() => RecurringExpense.createForImport({ ...pastProps, startMonth: 13 })).toThrow(
      "Month must be an integer between 1 and 12",
    );
  });
});
