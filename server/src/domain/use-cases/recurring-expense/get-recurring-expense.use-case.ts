import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RecurringExpenseNotFoundError } from "@src/domain/errors/domain-error";

export interface GetRecurringExpenseInput {
  id: string;
  userId: string;
}

export interface RecurringExpenseDetails {
  expense: RecurringExpense;
  versions: RecurringExpenseVersion[];
}

export class GetRecurringExpenseUseCase {
  public constructor(private readonly repository: RecurringExpenseRepository) {}

  public async execute(input: GetRecurringExpenseInput): Promise<RecurringExpenseDetails> {
    const result = await this.repository.findByIdWithVersions(input.id);

    if (!result || result.expense.userId !== input.userId) {
      throw new RecurringExpenseNotFoundError(input.id);
    }

    return result;
  }
}
