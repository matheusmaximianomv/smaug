import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";

export interface ListInstallmentExpensesInput {
  userId: string;
}

export class ListInstallmentExpensesUseCase {
  public constructor(private readonly repository: InstallmentExpenseRepository) {}

  public async execute(input: ListInstallmentExpensesInput): Promise<InstallmentExpense[]> {
    return this.repository.listByUser(input.userId);
  }
}
