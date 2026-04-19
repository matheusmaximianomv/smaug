import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { InstallmentExpenseNotFoundError } from "@src/domain/errors/domain-error";

export interface GetInstallmentExpenseInput {
  id: string;
  userId: string;
}

export interface InstallmentExpenseDetails {
  expense: InstallmentExpense;
  installments: Installment[];
}

export class GetInstallmentExpenseUseCase {
  public constructor(private readonly repository: InstallmentExpenseRepository) {}

  public async execute(input: GetInstallmentExpenseInput): Promise<InstallmentExpenseDetails> {
    const expense = await this.repository.findById(input.id);

    if (!expense || expense.userId !== input.userId) {
      throw new InstallmentExpenseNotFoundError(input.id);
    }

    const installments = await this.repository.findInstallmentsByExpense(expense.id);

    return { expense, installments };
  }
}
