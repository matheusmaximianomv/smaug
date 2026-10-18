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
  /** Senha de cada usuário, por id: o que `POST /auth/login` confere. */
  passwords: Record<string, string>;
  /**
   * Dono do refresh token válido — o cookie `httpOnly` que o MSW não enxerga. `null` é "sem
   * cookie": `POST /auth/refresh` responde 401 `INVALID_REFRESH_TOKEN`.
   */
  session: { userId: string } | null;
  /** Contador dos access tokens emitidos, para cada renovação devolver um token diferente. */
  issuedTokens: number;
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
    passwords: {},
    session: null,
    issuedTokens: 0,
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
