import type { Category } from "@/features/categorias/types";

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

export interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
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
  currentVersion: RecurringExpenseVersion;
  versions: RecurringExpenseVersion[];
  createdAt: string;
  updatedAt: string;
}
