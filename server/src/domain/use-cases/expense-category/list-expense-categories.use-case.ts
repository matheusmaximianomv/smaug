import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export interface ListExpenseCategoriesInput {
  userId: string;
}

export class ListExpenseCategoriesUseCase {
  public constructor(private readonly repository: ExpenseCategoryRepository) {}

  public async execute(input: ListExpenseCategoriesInput): Promise<ExpenseCategory[]> {
    return this.repository.listByUser(input.userId);
  }
}
