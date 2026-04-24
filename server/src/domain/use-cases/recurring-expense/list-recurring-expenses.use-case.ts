import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";

export interface ListRecurringExpensesInput {
  userId: string;
}

export class ListRecurringExpensesUseCase {
  public constructor(private readonly repository: RecurringExpenseRepository) {}

  public async execute(input: ListRecurringExpensesInput): Promise<RecurringExpense[]> {
    return this.repository.listByUser(input.userId);
  }
}
