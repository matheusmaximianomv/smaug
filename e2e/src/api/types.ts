/**
 * Espelho dos DTOs de resposta da API. Deliberadamente uma cópia: o pacote e2e é
 * caixa-preta e não importa código de `server/` nem de `web/`. Divergência aqui
 * quebra a compilação dos testes, que é o sinal desejado.
 */

export interface UserDto {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface CategoryDto {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  linkedExpensesCount?: number;
}

export interface OneTimeRevenueDto {
  id: string;
  userId: string;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface FixedRevenueVersionDto {
  id: string;
  fixedRevenueId: string;
  description: string;
  amount: number;
  effectiveMonth: number;
  effectiveYear: number;
  createdAt: string;
}

export interface FixedRevenueDto {
  id: string;
  userId: string;
  modality: "ALTERABLE" | "UNALTERABLE";
  startMonth: number;
  startYear: number;
  endMonth: number | null;
  endYear: number | null;
  createdAt: string;
  updatedAt: string;
  currentVersion?: FixedRevenueVersionDto;
  versions?: FixedRevenueVersionDto[];
}

interface EmbeddedCategory {
  id: string;
  name: string;
}

export interface OneTimeExpenseDto {
  id: string;
  userId: string;
  categoryId: string;
  category: EmbeddedCategory;
  description: string;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
  updatedAt: string;
}

export interface InstallmentDto {
  id: string;
  installmentNumber: number;
  amount: number;
  competenceYear: number;
  competenceMonth: number;
  createdAt: string;
}

export interface InstallmentExpenseDto {
  id: string;
  userId: string;
  categoryId: string;
  category: EmbeddedCategory;
  description: string;
  totalAmount: number;
  installmentCount: number;
  startYear: number;
  startMonth: number;
  installments: InstallmentDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpenseVersionDto {
  id: string;
  categoryId: string;
  category: EmbeddedCategory;
  description: string;
  amount: number;
  effectiveYear: number;
  effectiveMonth: number;
  createdAt: string;
}

export interface RecurringExpenseDto {
  id: string;
  userId: string;
  startYear: number;
  startMonth: number;
  endYear: number | null;
  endMonth: number | null;
  currentVersion: RecurringExpenseVersionDto;
  versions: RecurringExpenseVersionDto[];
  createdAt: string;
  updatedAt: string;
}

export interface RevenueQueryDto {
  competenceYear: number;
  competenceMonth: number;
  oneTimeRevenues: { id: string; description: string; amount: number }[];
  fixedRevenues: {
    id: string;
    modality: string;
    currentVersion: { description: string; amount: number };
  }[];
  totals: { oneTimeTotal: number; fixedTotal: number; total: number };
}

export interface ExpenseQueryDto {
  competenceYear: number;
  competenceMonth: number;
  expenses: {
    id: string;
    type: "ONE_TIME" | "INSTALLMENT" | "RECURRING";
    description: string;
    amount: number;
    category: EmbeddedCategory;
  }[];
  totals: { oneTime: number; installment: number; recurring: number; total: number };
}
