import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeleteOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/delete-one-time-expense.use-case";
import type { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { OneTimeExpense, type OneTimeExpenseProps } from "@src/domain/entities/one-time-expense.entity";
import {
  OneTimeExpenseNotFoundError,
  OneTimeExpensePastCompetenceDeleteError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

const BASE_EXPENSE_PROPS: OneTimeExpenseProps = {
  id: "expense-1",
  userId: "user-1",
  categoryId: "category-1",
  description: "Mercado",
  amount: 250,
  competenceYear: 2026,
  competenceMonth: 4,
};

type OneTimeExpenseRepositoryMock = {
  [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn>;
};

describe("DeleteOneTimeExpenseUseCase", () => {
  let repository: OneTimeExpenseRepositoryMock;
  let useCase: DeleteOneTimeExpenseUseCase;
  let expense: OneTimeExpense;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    repository = {
      findById: vi.fn(),
      findAllByUser: vi.fn(),
      findByUserAndCompetence: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new DeleteOneTimeExpenseUseCase(repository as unknown as OneTimeExpenseRepository);
    expense = OneTimeExpense.create(BASE_EXPENSE_PROPS);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should delete expense when it belongs to user and competence is future", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);

    await useCase.execute({ id: expense.id, userId: "user-1" });

    expect(repository.delete).toHaveBeenCalledWith(expense.id);
  });

  it("should throw OneTimeExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "missing", userId: "user-1" })).rejects.toThrow(
      OneTimeExpenseNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw OneTimeExpenseNotFoundError when expense belongs to another user", async () => {
    const otherUserExpense = OneTimeExpense.create({ ...BASE_EXPENSE_PROPS, userId: "user-2" });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(otherUserExpense);

    await expect(useCase.execute({ id: otherUserExpense.id, userId: "user-1" })).rejects.toThrow(
      OneTimeExpenseNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw OneTimeExpensePastCompetenceDeleteError when competence is in the past", async () => {
    const pastExpense = OneTimeExpense.create({ ...BASE_EXPENSE_PROPS, competenceMonth: 2 });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(pastExpense);

    await expect(useCase.execute({ id: pastExpense.id, userId: "user-1" })).rejects.toThrow(
      OneTimeExpensePastCompetenceDeleteError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
