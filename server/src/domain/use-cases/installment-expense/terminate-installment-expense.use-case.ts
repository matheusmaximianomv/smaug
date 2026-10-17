import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import {
  InstallmentExpenseNotFoundError,
  NoFutureInstallmentsError,
} from "@src/domain/errors/domain-error";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

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

    if (!InstallmentExpense.hasFutureInstallments(allInstallments, referenceDate)) {
      throw new NoFutureInstallmentsError();
    }

    const current = MonthlyCompetence.current(referenceDate);
    await this.repository.deleteFutureInstallments(expense.id, current.month, current.year);

    const updatedExpense = expense.updateDetails({});
    const persistedExpense = await this.repository.update(updatedExpense);
    const remainingInstallments = await this.repository.findInstallmentsByExpense(expense.id);

    return {
      expense: persistedExpense,
      installments: remainingInstallments,
    };
  }
}
