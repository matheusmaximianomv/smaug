import { http, HttpResponse } from "msw";
import type { FixedRevenue, OneTimeRevenue, RevenueMonth } from "@/features/receitas/types";
import { addMonths, compareCompetences, type Competence } from "@/shared/lib/competence";
import { serverReference, url } from "../base";
import { db } from "../db";
import { apiStatus } from "./expenses";
import {
  fixedVersionAt,
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeOneTimeRevenue,
  projectFixedRevenue,
} from "../../fixtures";

const round = (n: number) => Math.round(n * 100) / 100;
const sum = (ns: number[]) => round(ns.reduce((a, b) => a + b, 0));
const notFound = () => HttpResponse.json({ error: "FIXED_REVENUE_NOT_FOUND" }, { status: 404 });
const project = (r: FixedRevenue) => projectFixedRevenue(r, serverReference());

/** Reproduz `RevenueQueryService.getConsolidatedRevenues` sobre o `db`. */
export function buildRevenueMonth(c: Competence): RevenueMonth {
  const reference = serverReference();
  const oneTimeRevenues = db.oneTimeRevenues.filter(
    (r) => r.competenceYear === c.year && r.competenceMonth === c.month,
  );

  const fixedRevenues = db.fixedRevenues.flatMap((r) => {
    const start = { year: r.startYear, month: r.startMonth };
    if (compareCompetences(c, start) < 0) return [];
    if (
      r.endYear !== null &&
      r.endMonth !== null &&
      compareCompetences(c, { year: r.endYear, month: r.endMonth }) > 0
    ) {
      return [];
    }
    const versions = r.versions ?? [r.currentVersion];
    const version = fixedVersionAt(versions, c);
    if (!version) return [];
    const startsNow = version.effectiveYear === c.year && version.effectiveMonth === c.month;
    const previous =
      startsNow && compareCompetences(c, start) > 0
        ? fixedVersionAt(versions, addMonths(c, -1))
        : undefined;
    const { versions: _omit, ...rest } = project(r);
    return [{ ...rest, currentVersion: version, previousAmount: previous?.amount ?? null }];
  });

  const oneTimeTotal = sum(oneTimeRevenues.map((r) => r.amount));
  const fixedTotal = sum(fixedRevenues.map((r) => r.currentVersion.amount));
  return {
    competenceYear: c.year,
    competenceMonth: c.month,
    competenceStatus: apiStatus(c, reference),
    reference,
    oneTimeRevenues,
    fixedRevenues,
    totals: { oneTimeTotal, fixedTotal, total: round(oneTimeTotal + fixedTotal) },
  };
}

export const revenueHandlers = [
  // ---- avulsas ----
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
  // Lista consumida pelo Histórico.
  http.get(url("/revenues/fixed"), () => HttpResponse.json(db.fixedRevenues)),

  http.get(url("/revenues/fixed/:id"), ({ params }) => {
    const revenue = db.fixedRevenues.find((r) => r.id === params.id);
    return revenue ? HttpResponse.json(project(revenue)) : notFound();
  }),

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
    return HttpResponse.json(project(created), { status: 201 });
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
    if (!rev) return notFound();
    const clash = (rev.versions ?? []).some(
      (v) => v.effectiveYear === b.effectiveYear && v.effectiveMonth === b.effectiveMonth,
    );
    if (clash) return HttpResponse.json({ error: "VERSION_CONFLICT" }, { status: 409 });

    const version = makeFixedRevenueVersion(b);
    rev.versions = [...(rev.versions ?? [rev.currentVersion]), version];
    rev.currentVersion = version;
    return HttpResponse.json(version);
  }),

  http.patch(url("/revenues/fixed/:id/terminate"), async ({ request, params }) => {
    const b = (await request.json()) as { endYear: number; endMonth: number };
    const rev = db.fixedRevenues.find((r) => r.id === params.id);
    if (!rev) return notFound();
    rev.endYear = b.endYear;
    rev.endMonth = b.endMonth;
    return HttpResponse.json(project(rev));
  }),

  http.delete(url("/revenues/fixed/:id"), ({ params }) => {
    db.fixedRevenues = db.fixedRevenues.filter((r) => r.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),

  // ---- consultas da tela e do dashboard ----
  http.get(url("/revenues/summary"), ({ request }) => {
    const year = Number(new URL(request.url).searchParams.get("year"));
    if (!Number.isInteger(year) || year < 2000) {
      return HttpResponse.json(
        { error: "VALIDATION_ERROR", message: "Year must be >= 2000" },
        { status: 400 },
      );
    }
    const months = Array.from({ length: 12 }, (_, i) => buildRevenueMonth({ year, month: i + 1 }));
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

  http.get(url("/revenues"), ({ request }) => {
    const q = new URL(request.url).searchParams;
    return HttpResponse.json(
      buildRevenueMonth({
        year: Number(q.get("competenceYear")),
        month: Number(q.get("competenceMonth")),
      }),
    );
  }),
];
