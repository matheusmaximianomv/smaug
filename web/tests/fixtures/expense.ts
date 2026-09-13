import type {
  Installment,
  InstallmentExpense,
  OneTimeExpense,
  RecurringExpense,
  RecurringExpenseVersion,
} from "@/features/despesas/types";
import { FIXED_DATE, fixtureUuid, nextId } from "./ids";
import { makeCategory } from "./category";

export function makeOneTimeExpense(o: Partial<OneTimeExpense> = {}): OneTimeExpense {
  const category = o.category ?? makeCategory();
  return {
    id: nextId("exp"),
    userId: fixtureUuid(1),
    categoryId: category.id,
    description: "Supermercado",
    amount: 450,
    competenceYear: 2026,
    competenceMonth: 9,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    category,
  };
}

export function makeInstallment(o: Partial<Installment> = {}): Installment {
  return {
    id: nextId("inst"),
    installmentNumber: 1,
    amount: 100,
    competenceYear: 2026,
    competenceMonth: 9,
    ...o,
  };
}

/**
 * Gera as N parcelas caminhando as competências para frente a partir de
 * start{Year,Month}, replicando o que o domínio faz no servidor. O card conta
 * "pagas" comparando essas competências com o mês corrente.
 */
export function makeInstallmentExpense(o: Partial<InstallmentExpense> = {}): InstallmentExpense {
  const category = o.category ?? makeCategory();
  const startYear = o.startYear ?? 2026;
  const startMonth = o.startMonth ?? 9;
  const installmentCount = o.installmentCount ?? 3;
  const totalAmount = o.totalAmount ?? 300;
  const per = Math.floor(Math.round(totalAmount * 100) / installmentCount) / 100;

  const installments =
    o.installments ??
    Array.from({ length: installmentCount }, (_, i) => {
      const d = new Date(Date.UTC(startYear, startMonth - 1 + i, 1));
      return makeInstallment({
        installmentNumber: i + 1,
        amount: per,
        competenceYear: d.getUTCFullYear(),
        competenceMonth: d.getUTCMonth() + 1,
      });
    });

  return {
    id: nextId("parc"),
    userId: fixtureUuid(1),
    categoryId: category.id,
    description: "Notebook",
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    category,
    startYear,
    startMonth,
    installmentCount,
    totalAmount,
    installments,
  };
}

/** `category` é opcional na prática: `ver.category?.name` tem ramo undefined. */
export function makeRecurringExpenseVersion(
  o: Partial<RecurringExpenseVersion> = {},
): RecurringExpenseVersion {
  const category = o.category ?? makeCategory();
  return {
    id: nextId("rev-v"),
    categoryId: category.id,
    description: "Aluguel",
    amount: 2200,
    effectiveYear: 2026,
    effectiveMonth: 9,
    createdAt: FIXED_DATE,
    ...o,
    category,
  };
}

export function makeRecurringExpense(o: Partial<RecurringExpense> = {}): RecurringExpense {
  const currentVersion = o.currentVersion ?? makeRecurringExpenseVersion();
  return {
    id: nextId("recor"),
    userId: fixtureUuid(1),
    startYear: currentVersion.effectiveYear,
    startMonth: currentVersion.effectiveMonth,
    endYear: null,
    endMonth: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    currentVersion,
  };
}
