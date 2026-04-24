import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TerminateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/terminate-installment-expense.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import {
  InstallmentExpenseNotFoundError,
  NoFutureInstallmentsError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";

describe("TerminateInstallmentExpenseUseCase", () => {
  let repository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: TerminateInstallmentExpenseUseCase;
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

    useCase = new TerminateInstallmentExpenseUseCase(repository as unknown as InstallmentExpenseRepository);

    expense = InstallmentExpense.create({
      id: "expense-1",
      userId: USER_ID,
      categoryId: "category-1",
      description: "Notebook",
      totalAmount: 1000,
      installmentCount: 3,
      startMonth: 3,
      startYear: 2026,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should terminate future installments and return remaining installments when future installments exist", async () => {
    const installments = [
      Installment.create({
        installmentExpenseId: expense.id,
        installmentNumber: 1,
        amount: 333.34,
        competenceMonth: 3,
        competenceYear: 2026,
      }),
      Installment.create({
        installmentExpenseId: expense.id,
        installmentNumber: 2,
        amount: 333.33,
        competenceMonth: 4,
        competenceYear: 2026,
      }),
    ];

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.findInstallmentsByExpense as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(installments)
      .mockResolvedValueOnce([installments[0]]);
    (repository.update as ReturnType<typeof vi.fn>).mockResolvedValue(expense);

    const result = await useCase.execute({ id: expense.id, userId: USER_ID });

    expect(repository.deleteFutureInstallments).toHaveBeenCalledWith(expense.id, 3, 2026);
    expect(repository.update).toHaveBeenCalledWith(expect.any(InstallmentExpense));
    expect(repository.findInstallmentsByExpense).toHaveBeenNthCalledWith(2, expense.id);
    expect(result.installments).toHaveLength(1);
    expect(result.installments[0].installmentNumber).toBe(1);
  });

  it("should throw NoFutureInstallmentsError when there are no future installments", async () => {
    const installments = [
      Installment.create({
        installmentExpenseId: expense.id,
        installmentNumber: 1,
        amount: 333.34,
        competenceMonth: 2,
        competenceYear: 2026,
      }),
    ];
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.findInstallmentsByExpense as ReturnType<typeof vi.fn>).mockResolvedValue(installments);

    await expect(useCase.execute({ id: expense.id, userId: USER_ID })).rejects.toThrow(NoFutureInstallmentsError);
    expect(repository.deleteFutureInstallments).not.toHaveBeenCalled();
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
      startMonth: 5,
      startYear: 2026,
    });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(useCase.execute({ id: otherUserExpense.id, userId: USER_ID })).rejects.toThrow(
      InstallmentExpenseNotFoundError,
    );
  });
});
