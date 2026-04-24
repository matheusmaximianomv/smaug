import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import {
  ExpenseCategoryNotFoundError,
  InstallmentExpenseNotFoundError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";

export interface UpdateInstallmentExpenseInput {
  id: string;
  userId: string;
  description?: string;
  categoryId?: string;
}

export interface InstallmentExpenseDetails {
  expense: InstallmentExpense;
  installments: Installment[];
}

export class UpdateInstallmentExpenseUseCase {
  public constructor(
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly categoryRepository: ExpenseCategoryRepository,
  ) {}

  public async execute(input: UpdateInstallmentExpenseInput): Promise<InstallmentExpenseDetails> {
    const expense = await this.installmentExpenseRepository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new InstallmentExpenseNotFoundError(input.id);
    }

    if (input.categoryId !== undefined) {
      const category = await this.categoryRepository.findById(input.categoryId);
      if (!category || category.userId !== input.userId) {
        throw new ExpenseCategoryNotFoundError(input.categoryId);
      }
    }

    const updatedExpense = expense.updateDetails({
      description: input.description,
      categoryId: input.categoryId,
    });

    const persistedExpense = await this.installmentExpenseRepository.update(updatedExpense);
    const installments = await this.installmentExpenseRepository.findInstallmentsByExpense(persistedExpense.id);

    return {
      expense: persistedExpense,
      installments,
    };
  }
}
