import { http, HttpResponse } from "msw";
import type { InstallmentExpense, OneTimeExpense } from "@/features/despesas/types";
import { url } from "../base";
import { db } from "../db";
import {
  makeExpenseQueryPayload,
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../fixtures";

const findCategory = (id: string) => db.categories.find((c) => c.id === id);

export const expenseHandlers = [
  // ---- avulsas ----
  http.get(url("/expenses/one-time"), () => HttpResponse.json(db.oneTimeExpenses)),

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
    if (i === -1) {
      return HttpResponse.json({ error: "ONE_TIME_EXPENSE_NOT_FOUND" }, { status: 404 });
    }
    db.oneTimeExpenses[i] = { ...db.oneTimeExpenses[i], ...b };
    return HttpResponse.json(db.oneTimeExpenses[i]);
  }),

  http.delete(url("/expenses/one-time/:id"), ({ params }) => {
    db.oneTimeExpenses = db.oneTimeExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- parceladas ----
  http.get(url("/expenses/installment"), () => HttpResponse.json(db.installmentExpenses)),

  http.post(url("/expenses/installment"), async ({ request }) => {
    const b = (await request.json()) as Partial<InstallmentExpense> & { categoryId: string };
    const category = findCategory(b.categoryId);
    const created = makeInstallmentExpense({ ...b, ...(category ? { category } : {}) });
    db.installmentExpenses.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.delete(url("/expenses/installment/:id"), ({ params }) => {
    db.installmentExpenses = db.installmentExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- recorrentes ----
  http.get(url("/expenses/recurring"), () => HttpResponse.json(db.recurringExpenses)),

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
    return HttpResponse.json(created, { status: 201 });
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
    if (!exp) {
      return HttpResponse.json({ error: "RECURRING_EXPENSE_NOT_FOUND" }, { status: 404 });
    }
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
    return HttpResponse.json(exp);
  }),

  http.patch(url("/expenses/recurring/:id/terminate"), async ({ request, params }) => {
    const b = (await request.json()) as { endYear: number; endMonth: number };
    const exp = db.recurringExpenses.find((e) => e.id === params.id);
    if (!exp) {
      return HttpResponse.json({ error: "RECURRING_EXPENSE_NOT_FOUND" }, { status: 404 });
    }
    exp.endYear = b.endYear;
    exp.endMonth = b.endMonth;
    return HttpResponse.json(exp);
  }),

  http.delete(url("/expenses/recurring/:id"), ({ params }) => {
    db.recurringExpenses = db.recurringExpenses.filter((e) => e.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- consulta consolidada (dashboard) ----
  http.get(url("/expenses"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const year = Number(q.get("competenceYear"));
    const month = Number(q.get("competenceMonth"));

    const oneTime = db.oneTimeExpenses
      .filter((e) => e.competenceYear === year && e.competenceMonth === month)
      .map((e) => ({
        id: e.id,
        type: "ONE_TIME" as const,
        description: e.description,
        amount: e.amount,
        category: { id: e.category.id, name: e.category.name },
      }));

    const installment = db.installmentExpenses.flatMap((e) =>
      e.installments
        .filter((i) => i.competenceYear === year && i.competenceMonth === month)
        .map((i) => ({
          id: i.id,
          type: "INSTALLMENT" as const,
          description: e.description,
          amount: i.amount,
          category: { id: e.category.id, name: e.category.name },
        })),
    );

    const recurring = db.recurringExpenses.map((e) => ({
      id: e.id,
      type: "RECURRING" as const,
      description: e.currentVersion.description,
      amount: e.currentVersion.amount,
      category: {
        id: e.currentVersion.category?.id,
        name: e.currentVersion.category?.name,
      } as { id: string; name: string },
    }));

    return HttpResponse.json(
      makeExpenseQueryPayload({
        competenceYear: year,
        competenceMonth: month,
        expenses: [...oneTime, ...installment, ...recurring],
      }),
    );
  }),
];
