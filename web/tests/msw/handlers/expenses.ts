import { http, HttpResponse } from "msw";
import type {
  ExpenseMonth,
  ExpenseMonthItem,
  InstallmentExpense,
  OneTimeExpense,
  RecurringExpense,
} from "@/features/despesas/types";
import {
  addMonths,
  compareCompetences,
  type ApiCompetenceStatus,
  type Competence,
} from "@/shared/lib/competence";
import { serverReference, url } from "../base";
import { db } from "../db";
import {
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
  projectInstallmentExpense,
  projectRecurringExpense,
  recurringVersionAt,
} from "../../fixtures";

const findCategory = (id: string) => db.categories.find((c) => c.id === id);
const round = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => round(ns.reduce((a, b) => a + b, 0));

export function apiStatus(c: Competence, reference: Competence): ApiCompetenceStatus {
  const diff = compareCompetences(c, reference);
  if (diff < 0) return "PAST";
  return diff === 0 ? "CURRENT" : "FUTURE";
}

const notFound = (error: string) => HttpResponse.json({ error }, { status: 404 });

const categoryRef = (c: { id: string; name: string } | undefined, fallbackId: string) => ({
  id: c?.id ?? fallbackId,
  name: c?.name ?? "",
});

/** Reproduz `ExpenseQueryService.getConsolidatedExpenses` sobre o `db`. */
export function buildExpenseMonth(c: Competence): ExpenseMonth {
  const reference = serverReference();
  const is = (y: number, m: number) => y === c.year && m === c.month;

  const oneTime: ExpenseMonthItem[] = db.oneTimeExpenses
    .filter((e) => is(e.competenceYear, e.competenceMonth))
    .map((e) => ({
      id: e.id,
      type: "ONE_TIME",
      userId: e.userId,
      categoryId: e.categoryId,
      category: categoryRef(e.category, e.categoryId),
      description: e.description,
      amount: e.amount,
      competenceYear: e.competenceYear,
      competenceMonth: e.competenceMonth,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

  const installment: ExpenseMonthItem[] = db.installmentExpenses.flatMap((e) => {
    const end = addMonths({ year: e.startYear, month: e.startMonth }, e.installmentCount - 1);
    return e.installments
      .filter((i) => is(i.competenceYear, i.competenceMonth))
      .map((i) => ({
        id: i.id,
        type: "INSTALLMENT" as const,
        userId: e.userId,
        categoryId: e.categoryId,
        category: categoryRef(e.category, e.categoryId),
        description: e.description,
        amount: i.amount,
        installmentExpenseId: e.id,
        installmentNumber: i.installmentNumber,
        installmentCount: e.installmentCount,
        totalAmount: e.totalAmount,
        startYear: e.startYear,
        startMonth: e.startMonth,
        endYear: end.year,
        endMonth: end.month,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      }));
  });

  const recurring: ExpenseMonthItem[] = db.recurringExpenses.flatMap((e) => {
    const start = { year: e.startYear, month: e.startMonth };
    const ended = e.endYear !== null && e.endMonth !== null;
    if (compareCompetences(c, start) < 0) return [];
    if (ended && compareCompetences(c, { year: e.endYear!, month: e.endMonth! }) > 0) return [];

    const versions = e.versions ?? [e.currentVersion];
    const version = recurringVersionAt(versions, c);
    if (!version) return [];
    const startsNow = version.effectiveYear === c.year && version.effectiveMonth === c.month;
    const previous =
      startsNow && compareCompetences(c, start) > 0
        ? recurringVersionAt(versions, addMonths(c, -1))
        : undefined;

    return [
      {
        id: version.id,
        type: "RECURRING" as const,
        userId: e.userId,
        categoryId: version.categoryId,
        category: categoryRef(version.category, version.categoryId),
        description: version.description,
        amount: version.amount,
        recurringExpenseId: e.id,
        startYear: e.startYear,
        startMonth: e.startMonth,
        endYear: e.endYear,
        endMonth: e.endMonth,
        effectiveYear: version.effectiveYear,
        effectiveMonth: version.effectiveMonth,
        versionId: version.id,
        previousAmount: previous?.amount ?? null,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      },
    ];
  });

  const expenses = [...oneTime, ...installment, ...recurring];
  const by = (type: ExpenseMonthItem["type"]) =>
    sum(expenses.filter((e) => e.type === type).map((e) => e.amount));
  return {
    competenceYear: c.year,
    competenceMonth: c.month,
    competenceStatus: apiStatus(c, reference),
    reference,
    expenses,
    totals: {
      oneTime: by("ONE_TIME"),
      installment: by("INSTALLMENT"),
      recurring: by("RECURRING"),
      total: sum(expenses.map((e) => e.amount)),
    },
  };
}

const projectInstallment = (e: InstallmentExpense) =>
  projectInstallmentExpense(e, serverReference());
const projectRecurring = (e: RecurringExpense) => projectRecurringExpense(e, serverReference());

const validationError = () =>
  HttpResponse.json(
    { error: "VALIDATION_ERROR", message: "Year must be >= 2000" },
    { status: 400 },
  );

export const expenseHandlers = [
  // ---- avulsas ----
  http.post(url("/expenses/one-time"), async ({ request }) => {
    const b = (await request.json()) as Partial<OneTimeExpense> & { categoryId: string };
    const category = findCategory(b.categoryId);
    const created = makeOneTimeExpense({ ...b, ...(category ? { category } : {}) });
    db.oneTimeExpenses.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(url("/expenses/one-time/:id"), async ({ request, params }) => {
    const b = (await request.json()) as Partial<OneTimeExpense>;
    const i = db.oneTimeExpenses.findIndex((e) => e.id === params.id);
    if (i === -1) return notFound("ONE_TIME_EXPENSE_NOT_FOUND");
    const category = b.categoryId ? findCategory(b.categoryId) : undefined;
    db.oneTimeExpenses[i] = { ...db.oneTimeExpenses[i], ...b, ...(category ? { category } : {}) };
    return HttpResponse.json(db.oneTimeExpenses[i]);
  }),

  http.delete(url("/expenses/one-time/:id"), ({ params }) => {
    db.oneTimeExpenses = db.oneTimeExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- parceladas ----
  http.get(url("/expenses/installment/:id"), ({ params }) => {
    const expense = db.installmentExpenses.find((e) => e.id === params.id);
    return expense
      ? HttpResponse.json(projectInstallment(expense))
      : notFound("INSTALLMENT_EXPENSE_NOT_FOUND");
  }),

  http.post(url("/expenses/installment"), async ({ request }) => {
    const b = (await request.json()) as Partial<InstallmentExpense> & { categoryId: string };
    const category = findCategory(b.categoryId);
    const created = makeInstallmentExpense({ ...b, ...(category ? { category } : {}) });
    db.installmentExpenses.push(created);
    return HttpResponse.json(projectInstallment(created), { status: 201 });
  }),

  http.post(url("/expenses/installment/:id/terminate"), ({ params }) => {
    const expense = db.installmentExpenses.find((e) => e.id === params.id);
    if (!expense) return notFound("INSTALLMENT_EXPENSE_NOT_FOUND");
    if (!projectInstallment(expense).canTerminate) {
      return HttpResponse.json({ error: "NO_FUTURE_INSTALLMENTS" }, { status: 409 });
    }
    const reference = serverReference();
    expense.installments = expense.installments.filter(
      (i) =>
        compareCompetences({ year: i.competenceYear, month: i.competenceMonth }, reference) <= 0,
    );
    return HttpResponse.json(projectInstallment(expense));
  }),

  http.delete(url("/expenses/installment/:id"), ({ params }) => {
    db.installmentExpenses = db.installmentExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- recorrentes ----
  // Lista consumida pelo Histórico.
  http.get(url("/expenses/recurring"), () => HttpResponse.json(db.recurringExpenses)),

  http.get(url("/expenses/recurring/:id"), ({ params }) => {
    const expense = db.recurringExpenses.find((e) => e.id === params.id);
    return expense
      ? HttpResponse.json(projectRecurring(expense))
      : notFound("RECURRING_EXPENSE_NOT_FOUND");
  }),

  http.post(url("/expenses/recurring"), async ({ request }) => {
    const b = (await request.json()) as {
      description: string;
      amount: number;
      categoryId: string;
      startYear: number;
      startMonth: number;
      endYear?: number | null;
      endMonth?: number | null;
    };
    const category = findCategory(b.categoryId);
    const currentVersion = makeRecurringExpenseVersion({
      description: b.description,
      amount: b.amount,
      categoryId: b.categoryId,
      effectiveYear: b.startYear,
      effectiveMonth: b.startMonth,
      ...(category ? { category } : {}),
    });
    const created = makeRecurringExpense({
      startYear: b.startYear,
      startMonth: b.startMonth,
      endYear: b.endYear ?? null,
      endMonth: b.endMonth ?? null,
      currentVersion,
      versions: [currentVersion],
    });
    db.recurringExpenses.push(created);
    return HttpResponse.json(projectRecurring(created), { status: 201 });
  }),

  http.patch(url("/expenses/recurring/:id"), async ({ request, params }) => {
    const b = (await request.json()) as {
      description?: string;
      amount?: number;
      categoryId?: string;
      effectiveYear: number;
      effectiveMonth: number;
    };
    const exp = db.recurringExpenses.find((e) => e.id === params.id);
    if (!exp) return notFound("RECURRING_EXPENSE_NOT_FOUND");
    const clash = (exp.versions ?? []).some(
      (v) => v.effectiveYear === b.effectiveYear && v.effectiveMonth === b.effectiveMonth,
    );
    if (clash) return HttpResponse.json({ error: "VERSION_CONFLICT" }, { status: 409 });

    const category = b.categoryId ? findCategory(b.categoryId) : undefined;
    const version = makeRecurringExpenseVersion({
      description: b.description ?? exp.currentVersion.description,
      amount: b.amount ?? exp.currentVersion.amount,
      categoryId: b.categoryId ?? exp.currentVersion.categoryId,
      effectiveYear: b.effectiveYear,
      effectiveMonth: b.effectiveMonth,
      ...(category ? { category } : {}),
    });
    exp.versions = [...(exp.versions ?? []), version];
    exp.currentVersion = version;
    return HttpResponse.json(projectRecurring(exp));
  }),

  http.patch(url("/expenses/recurring/:id/terminate"), async ({ request, params }) => {
    const b = (await request.json()) as { endYear: number; endMonth: number };
    const exp = db.recurringExpenses.find((e) => e.id === params.id);
    if (!exp) return notFound("RECURRING_EXPENSE_NOT_FOUND");
    exp.endYear = b.endYear;
    exp.endMonth = b.endMonth;
    return HttpResponse.json(projectRecurring(exp));
  }),

  http.delete(url("/expenses/recurring/:id"), ({ params }) => {
    db.recurringExpenses = db.recurringExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- consultas da tela e do dashboard ----
  http.get(url("/expenses/summary"), ({ request }) => {
    const year = Number(new URL(request.url).searchParams.get("year"));
    if (!Number.isInteger(year) || year < 2000) return validationError();
    const months = Array.from({ length: 12 }, (_, i) => buildExpenseMonth({ year, month: i + 1 }));
    return HttpResponse.json({
      year,
      reference: serverReference(),
      months: months.map((m) => ({
        month: m.competenceMonth,
        competenceStatus: m.competenceStatus,
        totals: m.totals,
      })),
    });
  }),

  http.get(url("/expenses"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    return HttpResponse.json(
      buildExpenseMonth({
        year: Number(q.get("competenceYear")),
        month: Number(q.get("competenceMonth")),
      }),
    );
  }),
];
