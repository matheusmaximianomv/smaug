import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";

export interface RecurringExpenseRepository {
  findById(id: string): Promise<RecurringExpense | null>;
  findByIdWithVersions(id: string): Promise<{ expense: RecurringExpense; versions: RecurringExpenseVersion[] } | null>;
  listByUser(userId: string): Promise<RecurringExpense[]>;
  create(expense: RecurringExpense, initialVersion: RecurringExpenseVersion): Promise<RecurringExpense>;
  update(expense: RecurringExpense): Promise<RecurringExpense>;
  terminate(expense: RecurringExpense): Promise<RecurringExpense>;
  delete(id: string): Promise<void>;
  addVersion(version: RecurringExpenseVersion): Promise<RecurringExpenseVersion>;
  findVersions(expenseId: string): Promise<RecurringExpenseVersion[]>;
  findVersionForMonth(expenseId: string, year: number, month: number): Promise<RecurringExpenseVersion | null>;
  findActiveForCompetence(userId: string, year: number, month: number): Promise<RecurringExpense[]>;
}
