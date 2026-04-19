import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";

export interface OneTimeExpenseRepository {
  findById(id: string): Promise<OneTimeExpense | null>;
  findAllByUser(userId: string): Promise<OneTimeExpense[]>;
  findByUserAndCompetence(userId: string, year: number, month: number): Promise<OneTimeExpense[]>;
  findByCategoryId(categoryId: string): Promise<OneTimeExpense[]>;
  create(expense: OneTimeExpense): Promise<OneTimeExpense>;
  update(expense: OneTimeExpense): Promise<OneTimeExpense>;
  delete(id: string): Promise<void>;
}
