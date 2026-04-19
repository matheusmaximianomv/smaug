import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import {
  ExpenseCategoryNotFoundError,
  InstallmentExpensePastStartError,
} from "@src/domain/errors/domain-error";

export interface CreateInstallmentExpenseInput {
  userId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  startMonth: number;
  startYear: number;
}

export interface InstallmentExpenseWithInstallments {
  expense: InstallmentExpense;
  installments: Installment[];
}

export class CreateInstallmentExpenseUseCase {
  public constructor(
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: CreateInstallmentExpenseInput): Promise<InstallmentExpenseWithInstallments> {
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.categoryId);
    }

    const startCompetence = MonthlyCompetence.create(input.startMonth, input.startYear);
    if (startCompetence.isPastMonth()) {
      throw new InstallmentExpensePastStartError();
    }

    const expense = InstallmentExpense.create({
      userId: input.userId,
      categoryId: input.categoryId,
      description: input.description,
      totalAmount: input.totalAmount,
      installmentCount: input.installmentCount,
      startMonth: input.startMonth,
      startYear: input.startYear,
    });

    const installments = expense.calculateInstallments();

    const createdExpense = await this.installmentExpenseRepository.create(expense, installments);
    const persistedInstallments = await this.installmentExpenseRepository.findInstallmentsByExpense(createdExpense.id);

    return {
      expense: createdExpense,
      installments: persistedInstallments,
    };
  }
}
