import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GetRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/get-recurring-expense.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { RecurringExpenseNotFoundError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("GetRecurringExpenseUseCase", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: GetRecurringExpenseUseCase;
  let expense: RecurringExpense;
  let versions: RecurringExpenseVersion[];

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

    useCase = new GetRecurringExpenseUseCase(repository as unknown as RecurringExpenseRepository);

    expense = RecurringExpense.create({
      id: "recurring-1",
      userId: "user-1",
      startMonth: 4,
      startYear: 2026,
    });

    versions = [
      RecurringExpenseVersion.create({
        recurringExpenseId: expense.id,
        categoryId: "category-1",
        description: "Aluguel",
        amount: 2000,
        effectiveMonth: 4,
        effectiveYear: 2026,
      }),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should return expense with versions when user owns expense", async () => {
    (repository.findByIdWithVersions as ReturnType<typeof vi.fn>).mockResolvedValue({ expense, versions });

    const result = await useCase.execute({ id: expense.id, userId: "user-1" });

    expect(repository.findByIdWithVersions).toHaveBeenCalledWith(expense.id);
    expect(result.expense).toEqual(expense);
    expect(result.versions).toEqual(versions);
  });

  it("should throw RecurringExpenseNotFoundError when expense does not exist", async () => {
    (repository.findByIdWithVersions as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: "user-1" })).rejects.toThrow(RecurringExpenseNotFoundError);
  });

  it("should throw RecurringExpenseNotFoundError when expense belongs to another user", async () => {
    const otherExpense = RecurringExpense.create({
      id: "recurring-2",
      userId: "user-2",
      startMonth: 5,
      startYear: 2026,
    });
    (repository.findByIdWithVersions as ReturnType<typeof vi.fn>).mockResolvedValue({ expense: otherExpense, versions });

    await expect(useCase.execute({ id: otherExpense.id, userId: "user-1" })).rejects.toThrow(
      RecurringExpenseNotFoundError,
    );
  });
});
