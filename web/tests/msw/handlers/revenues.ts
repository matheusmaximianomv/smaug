import { http, HttpResponse } from "msw";
import type { OneTimeRevenue } from "@/features/receitas/types";
import { url } from "../base";
import { db } from "../db";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeOneTimeRevenue,
  makeRevenueQueryPayload,
} from "../../fixtures";

export const revenueHandlers = [
  // ---- avulsas ----
  http.get(url("/revenues/one-time"), () => HttpResponse.json(db.oneTimeRevenues)),

  http.post(url("/revenues/one-time"), async ({ request }) => {
    const body = (await request.json()) as Partial<OneTimeRevenue>;
    const created = makeOneTimeRevenue(body);
    db.oneTimeRevenues.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put(url("/revenues/one-time/:id"), async ({ request, params }) => {
    const body = (await request.json()) as Partial<OneTimeRevenue>;
    const i = db.oneTimeRevenues.findIndex((r) => r.id === params.id);
    if (i === -1) return HttpResponse.json({ error: "REVENUE_NOT_FOUND" }, { status: 404 });
    db.oneTimeRevenues[i] = { ...db.oneTimeRevenues[i], ...body };
    return HttpResponse.json(db.oneTimeRevenues[i]);
  }),

  http.delete(url("/revenues/one-time/:id"), ({ params }) => {
    db.oneTimeRevenues = db.oneTimeRevenues.filter((r) => r.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- fixas ----
  http.get(url("/revenues/fixed"), () => HttpResponse.json(db.fixedRevenues)),

  http.post(url("/revenues/fixed"), async ({ request }) => {
    const b = (await request.json()) as {
      description: string;
      amount: number;
      modality: "ALTERABLE" | "UNALTERABLE";
      startYear: number;
      startMonth: number;
      endYear?: number | null;
      endMonth?: number | null;
    };
    const currentVersion = makeFixedRevenueVersion({
      description: b.description,
      amount: b.amount,
      effectiveYear: b.startYear,
      effectiveMonth: b.startMonth,
    });
    const created = makeFixedRevenue({
      modality: b.modality,
      startYear: b.startYear,
      startMonth: b.startMonth,
      endYear: b.endYear ?? null,
      endMonth: b.endMonth ?? null,
      currentVersion,
      versions: [currentVersion],
    });
    db.fixedRevenues.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // ATENÇÃO: devolve a VERSÃO criada, não a receita.
  http.patch(url("/revenues/fixed/:id"), async ({ request, params }) => {
    const b = (await request.json()) as {
      description: string;
      amount: number;
      effectiveYear: number;
      effectiveMonth: number;
    };
    const rev = db.fixedRevenues.find((r) => r.id === params.id);
    if (!rev) {
      return HttpResponse.json({ error: "FIXED_REVENUE_NOT_FOUND" }, { status: 404 });
    }
    const clash = (rev.versions ?? []).some(
      (v) => v.effectiveYear === b.effectiveYear && v.effectiveMonth === b.effectiveMonth,
    );
    if (clash) return HttpResponse.json({ error: "VERSION_CONFLICT" }, { status: 409 });

    const version = makeFixedRevenueVersion(b);
    rev.versions = [...(rev.versions ?? []), version];
    rev.currentVersion = version;
    return HttpResponse.json(version);
  }),

  http.patch(url("/revenues/fixed/:id/terminate"), async ({ request, params }) => {
    const b = (await request.json()) as { endYear: number; endMonth: number };
    const rev = db.fixedRevenues.find((r) => r.id === params.id);
    if (!rev) {
      return HttpResponse.json({ error: "FIXED_REVENUE_NOT_FOUND" }, { status: 404 });
    }
    rev.endYear = b.endYear;
    rev.endMonth = b.endMonth;
    return HttpResponse.json(rev);
  }),

  http.delete(url("/revenues/fixed/:id"), ({ params }) => {
    db.fixedRevenues = db.fixedRevenues.filter((r) => r.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- consulta consolidada (dashboard) ----
  http.get(url("/revenues"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    const year = Number(q.get("competenceYear"));
    const month = Number(q.get("competenceMonth"));
    return HttpResponse.json(
      makeRevenueQueryPayload({
        competenceYear: year,
        competenceMonth: month,
        oneTimeRevenues: db.oneTimeRevenues
          .filter((r) => r.competenceYear === year && r.competenceMonth === month)
          .map((r) => ({ id: r.id, description: r.description, amount: r.amount })),
        fixedRevenues: db.fixedRevenues.map((r) => ({
          id: r.id,
          modality: r.modality,
          currentVersion: {
            description: r.currentVersion.description,
            amount: r.currentVersion.amount,
          },
        })),
      }),
    );
  }),
];
