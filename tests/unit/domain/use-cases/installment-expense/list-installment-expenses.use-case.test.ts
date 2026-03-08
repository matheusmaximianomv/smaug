import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ListInstallmentExpensesUseCase } from "@src/domain/use-cases/installment-expense/list-installment-expenses.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";

describe("ListInstallmentExpensesUseCase", () => {
  let repository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let useCase: ListInstallmentExpensesUseCase;

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

    useCase = new ListInstallmentExpensesUseCase(repository as unknown as InstallmentExpenseRepository);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should list installment expenses for user when they exist", async () => {
    const expenses = [
      InstallmentExpense.create({
        id: "expense-1",
        userId: USER_ID,
        categoryId: "category-1",
        description: "Notebook",
        totalAmount: 1000,
        installmentCount: 3,
        startMonth: 4,
        startYear: 2026,
      }),
    ];

    (repository.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue(expenses);

    const result = await useCase.execute({ userId: USER_ID });

    expect(repository.listByUser).toHaveBeenCalledWith(USER_ID);
    expect(result).toEqual(expenses);
  });

  it("should return empty array when there are no expenses", async () => {
    (repository.listByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute({ userId: USER_ID });

    expect(result).toEqual([]);
  });
});
