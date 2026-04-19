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
    expect(() => RecurringExpense.create({ ...validProps, startMonth: 1 })).toThrow(PastCompetenceError);
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
