import type {
  Installment,
  InstallmentExpense,
  InstallmentStatus,
  OneTimeExpense,
  RecurringExpense,
  RecurringExpenseVersion,
} from "@/features/despesas/types";
import { addMonths, compareCompetences, type Competence } from "@/shared/lib/competence";
import { FIXED_DATE, fixtureUuid, nextId } from "./ids";
import { makeCategory } from "./category";
import { NOW_COMPETENCE } from "../time";

/**
 * Os campos que o servidor projeta a partir do "agora" (situação da parcela,
 * canDelete/canTerminate, isExpired) são calculados contra `reference` — por
 * padrão NOW_COMPETENCE nas fixtures; os handlers MSW recalculam com o relógio
 * (congelado) a cada resposta, como o servidor faria.
 */
export function installmentStatus(c: Competence, reference: Competence): InstallmentStatus {
  const diff = compareCompetences(c, reference);
  if (diff < 0) return "PAID";
  return diff === 0 ? "CURRENT" : "PENDING";
}

const competenceOf = (i: { competenceYear: number; competenceMonth: number }) => ({
  year: i.competenceYear,
  month: i.competenceMonth,
});

/** Recalcula as projeções do servidor de um parcelamento. */
export function projectInstallmentExpense(
  e: InstallmentExpense,
  reference: Competence = NOW_COMPETENCE,
): InstallmentExpense {
  const end = addMonths({ year: e.startYear, month: e.startMonth }, e.installmentCount - 1);
  const installments = e.installments.map((i) => ({
    ...i,
    status: installmentStatus(competenceOf(i), reference),
  }));
  return {
    ...e,
    endYear: end.year,
    endMonth: end.month,
    installments,
    canDelete: !installments.some((i) => i.status === "PAID"),
    canTerminate: installments.some((i) => i.status === "PENDING"),
  };
}

const effectiveOf = (v: RecurringExpenseVersion) => ({
  year: v.effectiveYear,
  month: v.effectiveMonth,
});

/** Versão em vigor em `c` (a última com vigência ≤ c), como o servidor resolve. */
export function recurringVersionAt(
  versions: RecurringExpenseVersion[],
  c: Competence,
): RecurringExpenseVersion | undefined {
  return [...versions]
    .sort((a, b) => compareCompetences(effectiveOf(a), effectiveOf(b)))
    .filter((v) => compareCompetences(effectiveOf(v), c) <= 0)
    .at(-1);
}

/** Recalcula `isExpired`, `reference` e a versão vigente de uma recorrente. */
export function projectRecurringExpense(
  e: RecurringExpense,
  reference: Competence = NOW_COMPETENCE,
): RecurringExpense {
  const versions = e.versions ?? [e.currentVersion];
  const sorted = [...versions].sort((a, b) => compareCompetences(effectiveOf(a), effectiveOf(b)));
  const end =
    e.endYear !== null && e.endMonth !== null ? { year: e.endYear, month: e.endMonth } : null;
  return {
    ...e,
    versions: sorted,
    currentVersion: recurringVersionAt(sorted, reference) ?? sorted[0],
    isExpired: !!end && compareCompetences(end, reference) < 0,
    reference: { ...reference },
  };
}

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
  const competenceYear = o.competenceYear ?? 2026;
  const competenceMonth = o.competenceMonth ?? 9;
  return {
    id: nextId("inst"),
    installmentNumber: 1,
    amount: 100,
    status: installmentStatus({ year: competenceYear, month: competenceMonth }, NOW_COMPETENCE),
    ...o,
    competenceYear,
    competenceMonth,
  };
}

/**
 * Gera as N parcelas caminhando as competências para frente a partir de
 * start{Year,Month}, replicando o que o domínio faz no servidor: centavos
 * divididos com o piso e o resto na 1ª parcela.
 */
export function makeInstallmentExpense(o: Partial<InstallmentExpense> = {}): InstallmentExpense {
  const category = o.category ?? makeCategory();
  const startYear = o.startYear ?? 2026;
  const startMonth = o.startMonth ?? 9;
  const installmentCount = o.installmentCount ?? 3;
  const totalAmount = o.totalAmount ?? 300;
  const totalCents = Math.round(totalAmount * 100);
  const base = Math.floor(totalCents / installmentCount);
  const remainder = totalCents % installmentCount;

  const installments =
    o.installments ??
    Array.from({ length: installmentCount }, (_, i) => {
      const c = addMonths({ year: startYear, month: startMonth }, i);
      return makeInstallment({
        installmentNumber: i + 1,
        amount: (base + (i === 0 ? remainder : 0)) / 100,
        competenceYear: c.year,
        competenceMonth: c.month,
      });
    });

  return projectInstallmentExpense({
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
    endYear: 0,
    endMonth: 0,
    canDelete: true,
    canTerminate: true,
  });
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
    isExpired: false,
    reference: { ...NOW_COMPETENCE },
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...o,
    currentVersion,
  };
}
