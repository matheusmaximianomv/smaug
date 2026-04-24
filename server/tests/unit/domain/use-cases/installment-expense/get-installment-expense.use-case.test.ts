import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GetInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/get-installment-expense.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import {
  InstallmentExpenseNotFoundError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";

describe("GetInstallmentExpenseUseCase", () => {
  let repository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: GetInstallmentExpenseUseCase;
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

    useCase = new GetInstallmentExpenseUseCase(repository as unknown as InstallmentExpenseRepository);

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

  it("should return expense with installments when expense belongs to user", async () => {
    const installments = expense.calculateInstallments();
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.findInstallmentsByExpense as ReturnType<typeof vi.fn>).mockResolvedValue(installments);

    const result = await useCase.execute({ id: expense.id, userId: USER_ID });

    expect(repository.findById).toHaveBeenCalledWith(expense.id);
    expect(repository.findInstallmentsByExpense).toHaveBeenCalledWith(expense.id);
    expect(result.expense).toEqual(expense);
    expect(result.installments).toEqual(installments);
  });

  it("should throw InstallmentExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: USER_ID })).rejects.toThrow(InstallmentExpenseNotFoundError);
  });

  it("should throw InstallmentExpenseNotFoundError when expense belongs to another user", async () => {
    const otherUserExpense = InstallmentExpense.create({
      id: "expense-2",
      userId: "other-user",
      categoryId: "category-1",
      description: "Férias",
      totalAmount: 500,
      installmentCount: 2,
      startMonth: 5,
      startYear: 2026,
    });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(useCase.execute({ id: otherUserExpense.id, userId: USER_ID })).rejects.toThrow(
      InstallmentExpenseNotFoundError,
    );
  });
});
