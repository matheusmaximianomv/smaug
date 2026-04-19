import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import {
  ExpenseCategoryNotFoundError,
  RecurringExpenseNotFoundError,
  PastEffectiveDateError,
  EffectiveDateOutOfRangeError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface UpdateRecurringExpenseInput {
  id: string;
  userId: string;
  description?: string;
  amount?: number;
  categoryId?: string;
  effectiveMonth: number;
  effectiveYear: number;
}

export interface RecurringExpenseDetails {
  expense: RecurringExpense;
  versions: RecurringExpenseVersion[];
}

export class UpdateRecurringExpenseUseCase {
  public constructor(
    private readonly repository: RecurringExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: UpdateRecurringExpenseInput): Promise<RecurringExpenseDetails> {
    if (
      input.description === undefined &&
      input.amount === undefined &&
      input.categoryId === undefined
    ) {
      throw new Error("At least one field must be provided");
    }

    const expense = await this.repository.findById(input.id);
    if (!expense || expense.userId !== input.userId) {
      throw new RecurringExpenseNotFoundError(input.id);
    }

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category || category.userId !== input.userId) {
        throw new ExpenseCategoryNotFoundError(input.categoryId);
      }
    }

    const effectiveCompetence = MonthlyCompetence.create(input.effectiveMonth, input.effectiveYear);
    if (effectiveCompetence.isPastMonth()) {
      throw new PastEffectiveDateError();
    }

    const start = expense.getStartCompetence();
    if (effectiveCompetence.isBefore(start)) {
      throw new EffectiveDateOutOfRangeError();
    }

    const end = expense.getEndCompetence();
    if (end && effectiveCompetence.isAfter(end)) {
      throw new EffectiveDateOutOfRangeError();
    }

    const versions = await this.repository.findVersions(expense.id);

    const baseVersion = UpdateRecurringExpenseUseCase.findApplicableVersion(
      versions,
      effectiveCompetence,
    );

    const categoryId = input.categoryId ?? baseVersion.categoryId;
    const description = input.description?.trim() ?? baseVersion.description;
    const amount = input.amount ?? baseVersion.amount;

    const newVersion = RecurringExpenseVersion.create({
      recurringExpenseId: expense.id,
      categoryId,
      description,
      amount,
      effectiveMonth: effectiveCompetence.month,
      effectiveYear: effectiveCompetence.year,
    });

    await this.repository.addVersion(newVersion);
    const updatedVersions = await this.repository.findVersions(expense.id);

    return {
      expense,
      versions: updatedVersions,
    };
  }

  private static findApplicableVersion(
    versions: RecurringExpenseVersion[],
    effectiveCompetence: MonthlyCompetence,
  ): RecurringExpenseVersion {
    const applicable = versions
      .filter((version) => {
        const versionCompetence = MonthlyCompetence.create(version.effectiveMonth, version.effectiveYear);
        return !effectiveCompetence.isBefore(versionCompetence);
      })
      .sort((a, b) => {
        const aValue = a.effectiveYear * 12 + a.effectiveMonth;
        const bValue = b.effectiveYear * 12 + b.effectiveMonth;
        return aValue - bValue;
      });

    const baseVersion = applicable.pop();

    if (!baseVersion) {
      throw new EffectiveDateOutOfRangeError();
    }

    return baseVersion;
  }
}
