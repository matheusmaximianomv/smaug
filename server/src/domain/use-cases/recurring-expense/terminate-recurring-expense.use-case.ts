import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import {
  PastCompetenceError,
  RecurringExpenseAlreadyExpiredError,
  RecurringExpenseNotFoundError,
  EndDateBeforeStartError,
} from "@src/domain/errors/domain-error";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";

export interface TerminateRecurringExpenseInput {
  id: string;
  userId: string;
  endMonth: number;
  endYear: number;
}

export interface RecurringExpenseDetails {
  expense: RecurringExpense;
  versions: RecurringExpenseVersion[];
}

export class TerminateRecurringExpenseUseCase {
  public constructor(private readonly repository: RecurringExpenseRepository) {}

  public async execute(input: TerminateRecurringExpenseInput): Promise<RecurringExpenseDetails> {
    const expense = await this.repository.findById(input.id);
    if (!expense || expense.userId !== input.userId) {
      throw new RecurringExpenseNotFoundError(input.id);
    }

    const existingEnd = expense.getEndCompetence();
    if (existingEnd && existingEnd.isPastMonth()) {
      throw new RecurringExpenseAlreadyExpiredError();
    }

    const terminationCompetence = MonthlyCompetence.create(input.endMonth, input.endYear);
    if (terminationCompetence.isPastMonth()) {
      throw new PastCompetenceError();
    }

    try {
      const terminatedExpense = expense.terminate(input.endMonth, input.endYear);
      const persisted = await this.repository.terminate(terminatedExpense);
      const versions = await this.repository.findVersions(persisted.id);
      return { expense: persisted, versions };
    } catch (error) {
      if (error instanceof EndDateBeforeStartError) {
        throw error;
      }
      throw error;
    }
  }
}
