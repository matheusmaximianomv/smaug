import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListOneTimeExpensesUseCase } from "@src/domain/use-cases/one-time-expense/list-one-time-expenses.use-case";
import type { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { OneTimeExpense, type OneTimeExpenseProps } from "@src/domain/entities/one-time-expense.entity";

type OneTimeExpenseRepositoryMock = {
  [K in keyof OneTimeExpenseRepository]: ReturnType<typeof vi.fn>;
};

const BASE_PROPS: OneTimeExpenseProps = {
  id: "expense-1",
  userId: "user-1",
  categoryId: "category-1",
  description: "Jantar",
  amount: 120,
  competenceYear: 2026,
  competenceMonth: 3,
};

const makeExpense = (overrides: Partial<OneTimeExpenseProps> = {}): OneTimeExpense =>
  OneTimeExpense.create({ ...BASE_PROPS, ...overrides });

describe("ListOneTimeExpensesUseCase", () => {
  let repository: OneTimeExpenseRepositoryMock;
  let useCase: ListOneTimeExpensesUseCase;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findAllByUser: vi.fn(),
      findByUserAndCompetence: vi.fn(),
      findByCategoryId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    useCase = new ListOneTimeExpensesUseCase(repository as unknown as OneTimeExpenseRepository);
  });

  it("should list expenses filtered by competence when competence filters provided", async () => {
    const expenses = [makeExpense({ id: "expense-competence" })];
    (repository.findByUserAndCompetence as ReturnType<typeof vi.fn>).mockResolvedValue(expenses);

    const result = await useCase.execute({ userId: "user-1", competenceYear: 2026, competenceMonth: 3 });

    expect(repository.findByUserAndCompetence).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(repository.findAllByUser).not.toHaveBeenCalled();
    expect(result).toEqual(expenses);
  });

  it("should list all expenses when competence filters are not provided", async () => {
    const expenses = [makeExpense({ id: "expense-all" })];
    (repository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue(expenses);

    const result = await useCase.execute({ userId: "user-1" });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
    expect(repository.findByUserAndCompetence).not.toHaveBeenCalled();
    expect(result).toEqual(expenses);
  });
});
