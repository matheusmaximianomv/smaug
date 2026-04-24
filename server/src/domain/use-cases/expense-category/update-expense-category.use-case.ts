import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNameAlreadyExistsError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export interface UpdateExpenseCategoryInput {
  id: string;
  userId: string;
  name: string;
}

export class UpdateExpenseCategoryUseCase {
  public constructor(private readonly repository: ExpenseCategoryRepository) {}

  public async execute(input: UpdateExpenseCategoryInput): Promise<ExpenseCategory> {
    const category = await this.repository.findById(input.id);
    if (!category || category.userId !== input.userId) {
      throw new ExpenseCategoryNotFoundError(input.id);
    }

    const normalizedName = input.name.trim();
    if (category.nameLower !== normalizedName.toLowerCase()) {
      const existing = await this.repository.findByNameLower(input.userId, normalizedName.toLowerCase());
      if (existing) {
        throw new ExpenseCategoryNameAlreadyExistsError(normalizedName);
      }
    }

    const updatedCategory = category.updateName(input.name);
    return this.repository.update(updatedCategory);
  }
}
