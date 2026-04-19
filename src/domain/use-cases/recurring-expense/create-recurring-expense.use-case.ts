import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

export interface CreateRecurringExpenseInput {
  userId: string;
  categoryId: string;
  description: string;
  amount: number;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
}

export interface RecurringExpenseDetails {
  expense: RecurringExpense;
  versions: RecurringExpenseVersion[];
}

export class CreateRecurringExpenseUseCase {
  public constructor(
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly expenseCategoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: CreateRecurringExpenseInput): Promise<RecurringExpenseDetails> {
    const category = await this.expenseCategoryRepository.findById(input.categoryId);
    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.categoryId);
    }

    const expense = RecurringExpense.create({
      userId: input.userId,
      startMonth: input.startMonth,
      startYear: input.startYear,
      endMonth: input.endMonth ?? null,
      endYear: input.endYear ?? null,
    });

    const initialVersion = RecurringExpenseVersion.create({
      recurringExpenseId: expense.id,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      effectiveMonth: expense.startMonth,
      effectiveYear: expense.startYear,
    });

    const createdExpense = await this.recurringExpenseRepository.create(expense, initialVersion);
    const versions = await this.recurringExpenseRepository.findVersions(createdExpense.id);

    return {
      expense: createdExpense,
      versions,
    };
  }
}
