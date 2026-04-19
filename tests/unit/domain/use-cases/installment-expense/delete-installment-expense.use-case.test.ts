import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeleteInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/delete-installment-expense.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import {
  InstallmentExpenseNotFoundError,
  InstallmentHasPastCompetenceError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";

describe("DeleteInstallmentExpenseUseCase", () => {
  let repository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: DeleteInstallmentExpenseUseCase;
  let expense: InstallmentExpense;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    repository = {
      findById: vi.fn(),
      listByUser: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateInstallments: vi.fn(),
      delete: vi.fn(),
      deleteFutureInstallments: vi.fn(),
      hasPastInstallments: vi.fn(),
      findInstallmentsByExpense: vi.fn(),
      findInstallmentsByCompetence: vi.fn(),
    };

    useCase = new DeleteInstallmentExpenseUseCase(repository as unknown as InstallmentExpenseRepository);

    expense = InstallmentExpense.create({
      id: "expense-1",
      userId: USER_ID,
      categoryId: "category-1",
      description: "Notebook",
      totalAmount: 1000,
      installmentCount: 3,
      startMonth: 4,
      startYear: 2026,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should delete expense when there are no past installments", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.hasPastInstallments as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    await useCase.execute({ id: expense.id, userId: USER_ID });

    expect(repository.hasPastInstallments).toHaveBeenCalledWith(expense.id, 3, 2026);
    expect(repository.delete).toHaveBeenCalledWith(expense.id);
  });

  it("should throw InstallmentHasPastCompetenceError when there are past installments", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.hasPastInstallments as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await expect(useCase.execute({ id: expense.id, userId: USER_ID })).rejects.toThrow(
      InstallmentHasPastCompetenceError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw InstallmentExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: USER_ID })).rejects.toThrow(
      InstallmentExpenseNotFoundError,
    );
  });

  it("should throw InstallmentExpenseNotFoundError when expense belongs to another user", async () => {
    const otherUserExpense = InstallmentExpense.create({
      id: "expense-2",
      userId: "other-user",
      categoryId: "category-1",
      description: "Viagem",
      totalAmount: 500,
      installmentCount: 2,
      startMonth: 6,
      startYear: 2026,
    });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(useCase.execute({ id: otherUserExpense.id, userId: USER_ID })).rejects.toThrow(
      InstallmentExpenseNotFoundError,
    );
  });
});
