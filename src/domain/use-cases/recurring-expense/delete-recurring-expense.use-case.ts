import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RecurringExpenseNotFoundError } from "@src/domain/errors/domain-error";

export interface DeleteRecurringExpenseInput {
  id: string;
  userId: string;
}

export class DeleteRecurringExpenseUseCase {
  public constructor(private readonly repository: RecurringExpenseRepository) {}

  public async execute(input: DeleteRecurringExpenseInput): Promise<void> {
    const expense = await this.repository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new RecurringExpenseNotFoundError(input.id);
    }

    await this.repository.delete(expense.id);
  }
}
