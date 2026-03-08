import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UpdateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/update-installment-expense.use-case";
import type { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
  InstallmentExpenseNotFoundError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");
const USER_ID = "user-1";

describe("UpdateInstallmentExpenseUseCase", () => {
  let repository: { [K in keyof InstallmentExpenseRepository]: ReturnType<typeof vi.fn> };
  let categoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: UpdateInstallmentExpenseUseCase;
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

    categoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      hasLinkedExpenses: vi.fn(),
    };

    useCase = new UpdateInstallmentExpenseUseCase(
      repository as unknown as InstallmentExpenseRepository,
      categoryRepository as unknown as ExpenseCategoryRepository,
    );

    expense = InstallmentExpense.create({
      id: "expense-1",
      userId: USER_ID,
      categoryId: "category-1",
      description: "Notebook",
      totalAmount: 1000,
      installmentCount: 3,
      startMonth: 5,
      startYear: 2026,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should update description and category when data is valid", async () => {
    const newCategory = ExpenseCategory.create({ id: "category-2", userId: USER_ID, name: "Viagem" });
    const updatedExpense = expense.updateDetails({ description: "Notebook parcelado", categoryId: "category-2" });
    const installments = updatedExpense.calculateInstallments();

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(newCategory);
    (repository.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedExpense);
    (repository.findInstallmentsByExpense as ReturnType<typeof vi.fn>).mockResolvedValue(installments);

    const result = await useCase.execute({
      id: expense.id,
      userId: USER_ID,
      description: "Notebook parcelado",
      categoryId: "category-2",
    });

    expect(categoryRepository.findById).toHaveBeenCalledWith("category-2");
    expect(repository.update).toHaveBeenCalledWith(expect.any(InstallmentExpense));
    expect(repository.findInstallmentsByExpense).toHaveBeenCalledWith(expense.id);
    expect(result.expense).toEqual(updatedExpense);
    expect(result.installments).toEqual(installments);
  });

  it("should update description without changing category when categoryId not provided", async () => {
    const updatedExpense = expense.updateDetails({ description: "Notebook atualizado" });
    const installments = updatedExpense.calculateInstallments();

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedExpense);
    (repository.findInstallmentsByExpense as ReturnType<typeof vi.fn>).mockResolvedValue(installments);

    const result = await useCase.execute({ id: expense.id, userId: USER_ID, description: "Notebook atualizado" });

    expect(categoryRepository.findById).not.toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith(expect.any(InstallmentExpense));
    expect(result.expense.description).toBe("Notebook atualizado");
  });

  it("should throw InstallmentExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ id: "missing", userId: USER_ID, description: "Notebook novo" }),
    ).rejects.toThrow(InstallmentExpenseNotFoundError);
  });

  it("should throw InstallmentExpenseNotFoundError when expense belongs to another user", async () => {
    const otherUserExpense = InstallmentExpense.create({
      id: "expense-2",
      userId: "other-user",
      categoryId: "category-1",
      description: "Outro",
      totalAmount: 800,
      installmentCount: 2,
      startMonth: 6,
      startYear: 2026,
    });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(
      useCase.execute({ id: otherUserExpense.id, userId: USER_ID, description: "Notebook novo" }),
    ).rejects.toThrow(InstallmentExpenseNotFoundError);
  });

  it("should throw ExpenseCategoryNotFoundError when new category is invalid", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({ id: expense.id, userId: USER_ID, categoryId: "missing-category" }),
    ).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(repository.update).not.toHaveBeenCalled();
  });
});
