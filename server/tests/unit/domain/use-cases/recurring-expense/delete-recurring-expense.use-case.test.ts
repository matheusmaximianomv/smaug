import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeleteRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/delete-recurring-expense.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseNotFoundError } from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("DeleteRecurringExpenseUseCase", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: DeleteRecurringExpenseUseCase;
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

    useCase = new DeleteRecurringExpenseUseCase(repository as unknown as RecurringExpenseRepository);

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

  it("should delete recurring expense when it belongs to the user", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);

    await useCase.execute({ id: expense.id, userId: "user-1" });

    expect(repository.delete).toHaveBeenCalledWith(expense.id);
  });

  it("should throw RecurringExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: "user-1" })).rejects.toThrow(RecurringExpenseNotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw RecurringExpenseNotFoundError when expense belongs to another user", async () => {
    const otherExpense = RecurringExpense.create({ id: "recurring-2", userId: "user-2", startMonth: 4, startYear: 2026 });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherExpense);

    await expect(useCase.execute({ id: otherExpense.id, userId: "user-1" })).rejects.toThrow(RecurringExpenseNotFoundError);
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
