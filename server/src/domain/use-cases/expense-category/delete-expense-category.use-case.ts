import { ExpenseCategoryNotFoundError, ExpenseCategoryHasLinkedExpensesError } from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export interface DeleteExpenseCategoryInput {
  id: string;
  userId: string;
}

export class DeleteExpenseCategoryUseCase {
  public constructor(private readonly repository: ExpenseCategoryRepository) {}

  public async execute(input: DeleteExpenseCategoryInput): Promise<void> {
    const category = await this.repository.findById(input.id);

    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.id);
    }

    const linkedExpensesCount = await this.repository.countLinkedExpenses(input.id);
    if (linkedExpensesCount > 0) {
      throw new ExpenseCategoryHasLinkedExpensesError();
    }

    await this.repository.delete(input.id);
  }
}
