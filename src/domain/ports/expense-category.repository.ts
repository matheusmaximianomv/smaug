import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

export interface ExpenseCategoryRepository {
  findById(id: string): Promise<ExpenseCategory | null>;
  findByNameLower(userId: string, nameLower: string): Promise<ExpenseCategory | null>;
  listByUser(userId: string): Promise<ExpenseCategory[]>;
  create(category: ExpenseCategory): Promise<ExpenseCategory>;
  update(category: ExpenseCategory): Promise<ExpenseCategory>;
  delete(id: string): Promise<void>;
  hasLinkedExpenses(categoryId: string): Promise<boolean>;
}
