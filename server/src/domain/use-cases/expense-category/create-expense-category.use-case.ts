import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryNameAlreadyExistsError } from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export interface CreateExpenseCategoryInput {
  userId: string;
  name: string;
}

export class CreateExpenseCategoryUseCase {
  public constructor(private readonly repository: ExpenseCategoryRepository) {}

  public async execute(input: CreateExpenseCategoryInput): Promise<ExpenseCategory> {
    const normalizedName = input.name.trim();

    const existingCategory = await this.repository.findByNameLower(
      input.userId,
      normalizedName.toLowerCase(),
    );
    if (existingCategory) {
      throw new ExpenseCategoryNameAlreadyExistsError(normalizedName);
    }

    const category = ExpenseCategory.create({
      userId: input.userId,
      name: normalizedName,
    });

    return this.repository.create(category);
  }
}
