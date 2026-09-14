import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";

export interface ImportPayload {
  categories: ExpenseCategory[];
  oneTimeRevenues: OneTimeRevenue[];
  fixedRevenues: Array<{ revenue: FixedRevenue; versions: FixedRevenueVersion[] }>;
  oneTimeExpenses: OneTimeExpense[];
  installmentExpenses: Array<{ expense: InstallmentExpense; installments: Installment[] }>;
  recurringExpenses: Array<{ expense: RecurringExpense; versions: RecurringExpenseVersion[] }>;
}

export interface DataImportRepository {
  /**
   * Grava o lote inteiro numa única transação. A importação não deduplica, então uma gravação
   * parcial não poderia ser repetida sem duplicar o que já entrou — ou tudo, ou nada.
   */
  persist(payload: ImportPayload): Promise<void>;
}
