import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ListRecurringExpensesUseCase } from "@src/domain/use-cases/recurring-expense/list-recurring-expenses.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("ListRecurringExpensesUseCase", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: ListRecurringExpensesUseCase;

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

    useCase = new ListRecurringExpensesUseCase(repository as unknown as RecurringExpenseRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should list recurring expenses for user", async () => {
    const expenses = [
      RecurringExpense.create({ id: "recurring-1", userId: "user-1", startMonth: 4, startYear: 2026 }),
    ];
    (repository.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(expenses);

    const result = await useCase.execute({ userId: "user-1" });

    expect(repository.listByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual(expenses);
  });

  it("should return empty array when no expenses exist", async () => {
    (repository.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute({ userId: "user-1" });

    expect(result).toEqual([]);
  });
});
