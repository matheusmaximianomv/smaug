import type { Category } from "@/features/categorias/types";
import type { ApiCompetenceStatus, Competence } from "@/shared/lib/competence";

export interface OneTimeExpense {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}

/** Situação da parcela calculada pelo servidor: passada = paga, corrente = atual, futura = pendente. */
export type InstallmentStatus = "PAID" | "CURRENT" | "PENDING";

export interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  status: InstallmentStatus;
}

export interface InstallmentExpense {
  id: string;
  userId: string;
  categoryId: string;
  category: Category;
  description: string;
  totalAmount: number;
  installmentCount: number;
  startYear: number;
  startMonth: number;
  /** Competência da última parcela do plano. */
  endYear: number;
  endMonth: number;
  /** Nenhuma parcela passada: o servidor aceita a remoção. */
  canDelete: boolean;
  /** Há parcela futura: o servidor aceita o encerramento. */
  canTerminate: boolean;
  installments: Installment[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseVersion {
  id: string;
  categoryId: string;
  category: Category;
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  userId: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  /** Término anterior ao mês corrente do servidor. */
  isExpired: boolean;
  reference: Competence;
  currentVersion: RecurringExpenseVersion;
  versions?: RecurringExpenseVersion[];
  createdAt: string;
  updatedAt: string;
}

// ---- consulta mensal (GET /expenses) ----

interface ExpenseMonthItemBase {
  id: string;
  userId: string;
  categoryId: string;
  category: { id: string; name: string };
  description: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OneTimeExpenseMonthItem extends ExpenseMonthItemBase {
  type: "ONE_TIME";
  competenceYear: number;
  competenceMonth: number;
}

export interface InstallmentExpenseMonthItem extends ExpenseMonthItemBase {
  type: "INSTALLMENT";
  installmentExpenseId: string;
  installmentNumber: number;
  installmentCount: number;
  totalAmount: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
}

export interface RecurringExpenseMonthItem extends ExpenseMonthItemBase {
  type: "RECURRING";
  recurringExpenseId: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  effectiveYear: number;
  effectiveMonth: number;
  versionId: string;
  /** Valor da versão anterior no mês em que a vigente começa; `null` fora dele. */
  previousAmount: number | null;
}

export type ExpenseMonthItem =
  | OneTimeExpenseMonthItem
  | InstallmentExpenseMonthItem
  | RecurringExpenseMonthItem;

export interface ExpenseTotals {
  oneTime: number;
  installment: number;
  recurring: number;
  total: number;
}

export interface ExpenseMonth {
  competenceYear: number;
  competenceMonth: number;
  competenceStatus: ApiCompetenceStatus;
  /** Mês corrente do servidor (UTC). */
  reference: Competence;
  expenses: ExpenseMonthItem[];
  totals: ExpenseTotals;
}

export interface ExpenseYearSummary {
  year: number;
  reference: Competence;
  months: { month: number; competenceStatus: ApiCompetenceStatus; totals: ExpenseTotals }[];
}
