import {
  OneTimeExpenseNotFoundError,
  OneTimeExpensePastCompetenceDeleteError,
} from "@src/domain/errors/domain-error";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface DeleteOneTimeExpenseInput {
  id: string;
  userId: string;
}

export class DeleteOneTimeExpenseUseCase {
  public constructor(private readonly repository: OneTimeExpenseRepository) {}

  public async execute(input: DeleteOneTimeExpenseInput): Promise<void> {
    const expense = await this.repository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new OneTimeExpenseNotFoundError(input.id);
    }

    const competence = MonthlyCompetence.create(expense.competenceMonth, expense.competenceYear);
    if (competence.isPastMonth()) {
      throw new OneTimeExpensePastCompetenceDeleteError();
    }

    await this.repository.delete(expense.id);
  }
}
