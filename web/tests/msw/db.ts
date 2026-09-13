/**
 * Store em memória compartilhado pelos handlers MSW.
 *
 * É o que faz os testes de integração significarem algo: criar uma categoria →
 * o hook invalida a query → refetch → a linha nova realmente aparece. Sem isso
 * cada teste de mutação precisaria sequenciar `server.use()` na mão.
 *
 * `resetDb()` roda no afterEach global de `vitest.setup.ts`.
 */
import type { CategoryWithCount } from "@/features/categorias/types";
import type { FixedRevenue, OneTimeRevenue } from "@/features/receitas/types";
import type {
  InstallmentExpense,
  OneTimeExpense,
  RecurringExpense,
} from "@/features/despesas/types";
import type { User } from "@/features/auth/types";

export interface Db {
  users: User[];
  categories: CategoryWithCount[];
  oneTimeRevenues: OneTimeRevenue[];
  fixedRevenues: FixedRevenue[];
  oneTimeExpenses: OneTimeExpense[];
  installmentExpenses: InstallmentExpense[];
  recurringExpenses: RecurringExpense[];
}

function emptyDb(): Db {
  return {
    users: [],
    categories: [],
    oneTimeRevenues: [],
    fixedRevenues: [],
    oneTimeExpenses: [],
    installmentExpenses: [],
    recurringExpenses: [],
  };
}

export const db: Db = emptyDb();

export function resetDb(seed: Partial<Db> = {}): void {
  Object.assign(db, emptyDb(), seed);
}

export function seedDb(seed: Partial<Db>): void {
  Object.assign(db, seed);
}
