import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TerminateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/terminate-recurring-expense.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import {
  RecurringExpense,
  type RecurringExpensePersistenceProps,
} from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import {
  PastCompetenceError,
  RecurringExpenseAlreadyExpiredError,
  RecurringExpenseNotFoundError,
  EndDateBeforeStartError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("TerminateRecurringExpenseUseCase", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: TerminateRecurringExpenseUseCase;
  let expense: RecurringExpense;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    repository = {
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
    };

    useCase = new TerminateRecurringExpenseUseCase(repository as unknown as RecurringExpenseRepository);

    expense = RecurringExpense.create({
      id: "recurring-1",
      userId: "user-1",
      startMonth: 4,
      startYear: 2026,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should terminate recurring expense when end date is valid", async () => {
    const versions = [
      RecurringExpenseVersion.create({
        recurringExpenseId: expense.id,
        categoryId: "category-1",
        description: "Aluguel",
        amount: 2000,
        effectiveMonth: 4,
        effectiveYear: 2026,
      }),
    ];

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.terminate as ReturnType<typeof vi.fn>).mockImplementation(async (terminated) => terminated);
    (repository.findVersions as ReturnType<typeof vi.fn>).mockResolvedValue(versions);

    const result = await useCase.execute({ id: expense.id, userId: "user-1", endMonth: 6, endYear: 2026 });

    expect(repository.terminate).toHaveBeenCalledWith(expect.any(RecurringExpense));
    expect(result.expense.endMonth).toBe(6);
    expect(result.expense.endYear).toBe(2026);
    expect(result.versions).toEqual(versions);
  });

  it("should throw RecurringExpenseAlreadyExpiredError when expense already expired", async () => {
    const expiredProps: RecurringExpensePersistenceProps = {
      id: "recurring-expired",
      userId: "user-1",
      startMonth: 4,
      startYear: 2025,
      endMonth: 5,
      endYear: 2025,
      createdAt: BASE_DATE,
      updatedAt: BASE_DATE,
    };
    const expiredExpense = RecurringExpense.rehydrate(expiredProps);

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expiredExpense);

    await expect(useCase.execute({ id: expiredExpense.id, userId: "user-1", endMonth: 6, endYear: 2026 })).rejects.toThrow(
      RecurringExpenseAlreadyExpiredError,
    );
    expect(repository.terminate).not.toHaveBeenCalled();
  });

  it("should throw PastCompetenceError when termination date is in the past", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);

    await expect(useCase.execute({ id: expense.id, userId: "user-1", endMonth: 2, endYear: 2026 })).rejects.toThrow(
      PastCompetenceError,
    );
    expect(repository.terminate).not.toHaveBeenCalled();
  });

  it("should throw EndDateBeforeStartError when termination before start", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);

    await expect(useCase.execute({ id: expense.id, userId: "user-1", endMonth: 3, endYear: 2026 })).rejects.toThrow(
      EndDateBeforeStartError,
    );
    expect(repository.terminate).not.toHaveBeenCalled();
  });

  it("should throw RecurringExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: "user-1", endMonth: 6, endYear: 2026 })).rejects.toThrow(
      RecurringExpenseNotFoundError,
    );
  });

  it("should throw RecurringExpenseNotFoundError when expense belongs to another user", async () => {
    const otherExpense = RecurringExpense.rehydrate({
      id: "recurring-2",
      userId: "user-2",
      startMonth: 4,
      startYear: 2026,
      endMonth: null,
      endYear: null,
      createdAt: BASE_DATE,
      updatedAt: BASE_DATE,
    });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherExpense);

    await expect(useCase.execute({ id: otherExpense.id, userId: "user-1", endMonth: 6, endYear: 2026 })).rejects.toThrow(
      RecurringExpenseNotFoundError,
    );
  });
});
