import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export interface GetExpenseCategoryInput {
  id: string;
  userId: string;
}

export class GetExpenseCategoryUseCase {
  public constructor(private readonly repository: ExpenseCategoryRepository) {}

  public async execute(input: GetExpenseCategoryInput): Promise<ExpenseCategory> {
    const category = await this.repository.findById(input.id);

    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.id);
    }

    return category;
  }
}
