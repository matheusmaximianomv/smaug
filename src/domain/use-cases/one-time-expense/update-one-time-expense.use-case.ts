import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import {
  ExpenseCategoryNotFoundError,
  OneTimeExpenseNotFoundError,
  OneTimeExpensePastCompetenceEditError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface UpdateOneTimeExpenseInput {
  id: string;
  userId: string;
  categoryId?: string;
  description?: string;
  amount?: number;
  competenceMonth?: number;
  competenceYear?: number;
}

export class UpdateOneTimeExpenseUseCase {
  public constructor(
    private readonly expenseRepository: OneTimeExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: UpdateOneTimeExpenseInput): Promise<OneTimeExpense> {
    const expense = await this.expenseRepository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new OneTimeExpenseNotFoundError(input.id);
    }

    const targetCompetenceMonth = input.competenceMonth ?? expense.competenceMonth;
    const targetCompetenceYear = input.competenceYear ?? expense.competenceYear;
    const competence = MonthlyCompetence.create(targetCompetenceMonth, targetCompetenceYear);
    if (competence.isPastMonth()) {
      throw new OneTimeExpensePastCompetenceEditError();
    }

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category || category.userId !== input.userId) {
        throw new ExpenseCategoryNotFoundError(input.categoryId);
      }
    }

    const updated = expense.update({
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      competenceMonth: input.competenceMonth,
      competenceYear: input.competenceYear,
    });

    return this.expenseRepository.update(updated);
  }
}
