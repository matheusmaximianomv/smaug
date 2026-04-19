import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import {
  ExpenseCategoryNotFoundError,
  OneTimeExpensePastCompetenceCreateError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface CreateOneTimeExpenseInput {
  userId: string;
  categoryId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
}

export class CreateOneTimeExpenseUseCase {
  public constructor(
    private readonly expenseRepository: OneTimeExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: CreateOneTimeExpenseInput): Promise<OneTimeExpense> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.categoryId);
    }

    const competence = MonthlyCompetence.create(input.competenceMonth, input.competenceYear);
    if (competence.isPastMonth()) {
      throw new OneTimeExpensePastCompetenceCreateError();
    }

    const expense = OneTimeExpense.create({
      userId: input.userId,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      competenceMonth: input.competenceMonth,
      competenceYear: input.competenceYear,
    });

    return this.expenseRepository.create(expense);
  }
}
