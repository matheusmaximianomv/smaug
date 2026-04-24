import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import {
  InstallmentExpenseNotFoundError,
  NoFutureInstallmentsError,
} from "@src/domain/errors/domain-error";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";

export interface TerminateInstallmentExpenseInput {
  id: string;
  userId: string;
}

export interface InstallmentExpenseDetails {
  expense: InstallmentExpense;
  installments: Installment[];
}

export class TerminateInstallmentExpenseUseCase {
  public constructor(private readonly repository: InstallmentExpenseRepository) {}

  public async execute(input: TerminateInstallmentExpenseInput): Promise<InstallmentExpenseDetails> {
    const expense = await this.repository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new InstallmentExpenseNotFoundError(input.id);
    }

    const allInstallments = await this.repository.findInstallmentsByExpense(expense.id);
    const referenceDate = new Date();
    const referenceYear = referenceDate.getUTCFullYear();
    const referenceMonth = referenceDate.getUTCMonth() + 1;

    const hasFutureInstallments = allInstallments.some((installment) => {
      if (installment.competenceYear > referenceYear) return true;
      if (installment.competenceYear === referenceYear && installment.competenceMonth > referenceMonth) {
        return true;
      }
      return false;
    });

    if (!hasFutureInstallments) {
      throw new NoFutureInstallmentsError();
    }

    await this.repository.deleteFutureInstallments(expense.id, referenceMonth, referenceYear);

    const updatedExpense = expense.updateDetails({});
    const persistedExpense = await this.repository.update(updatedExpense);
    const remainingInstallments = await this.repository.findInstallmentsByExpense(expense.id);

    return {
      expense: persistedExpense,
      installments: remainingInstallments,
    };
  }
}
