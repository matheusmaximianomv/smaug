import {
  InstallmentExpenseNotFoundError,
  InstallmentHasPastCompetenceError,
} from "@src/domain/errors/domain-error";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";

export interface DeleteInstallmentExpenseInput {
  id: string;
  userId: string;
}

export class DeleteInstallmentExpenseUseCase {
  public constructor(private readonly repository: InstallmentExpenseRepository) {}

  public async execute(input: DeleteInstallmentExpenseInput): Promise<void> {
    const expense = await this.repository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new InstallmentExpenseNotFoundError(input.id);
    }

    const installments = await this.repository.findInstallmentsByExpense(expense.id);

    if (InstallmentExpense.hasPastInstallments(installments)) {
      throw new InstallmentHasPastCompetenceError();
    }

    await this.repository.delete(expense.id);
  }
}
