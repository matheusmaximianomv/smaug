import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";

export interface ListOneTimeExpensesInput {
  userId: string;
  competenceYear?: number;
  competenceMonth?: number;
}

export class ListOneTimeExpensesUseCase {
  public constructor(private readonly repository: OneTimeExpenseRepository) {}

  public async execute(input: ListOneTimeExpensesInput): Promise<OneTimeExpense[]> {
    if (input.competenceYear !== undefined && input.competenceMonth !== undefined) {
      return this.repository.findByUserAndCompetence(
        input.userId,
        input.competenceYear,
        input.competenceMonth,
      );
    }
    return this.repository.findAllByUser(input.userId);
  }
}
