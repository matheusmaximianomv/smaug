import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";

export interface InstallmentExpenseRepository {
  findById(id: string): Promise<InstallmentExpense | null>;
  listByUser(userId: string): Promise<InstallmentExpense[]>;
  findByCategoryId(categoryId: string): Promise<InstallmentExpense[]>;
  create(expense: InstallmentExpense, installments: Installment[]): Promise<InstallmentExpense>;
  update(expense: InstallmentExpense): Promise<InstallmentExpense>;
  updateInstallments(installments: Installment[]): Promise<void>;
  delete(id: string): Promise<void>;
  deleteFutureInstallments(expenseId: string, month: number, year: number): Promise<void>;
  hasPastInstallments(expenseId: string, referenceMonth: number, referenceYear: number): Promise<boolean>;
  findInstallmentsByExpense(expenseId: string): Promise<Installment[]>;
  findInstallmentsByCompetence(userId: string, year: number, month: number): Promise<Installment[]>;
}
