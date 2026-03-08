import {
  InstallmentExpenseNotFoundError,
  InstallmentHasPastCompetenceError,
} from "@src/domain/errors/domain-error";
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

    const referenceDate = new Date();
    const referenceYear = referenceDate.getUTCFullYear();
    const referenceMonth = referenceDate.getUTCMonth() + 1;

    const hasPastInstallments = await this.repository.hasPastInstallments(
      expense.id,
      referenceMonth,
      referenceYear,
    );

    if (hasPastInstallments) {
      throw new InstallmentHasPastCompetenceError();
    }

    await this.repository.delete(expense.id);
  }
}
