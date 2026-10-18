import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("lancamentos-read-api");
const PASSWORD = "correct-horse-battery-staple";
const UNAUTHORIZED_BODY = { error: "UNAUTHORIZED", message: "Authentication required" };
const UNAUTHENTICATED: [string, Record<string, string>][] = [
  ["without the Authorization header", {}],
  ["with an invalid Bearer token", { Authorization: "Bearer not-a-valid-token" }],
];
const MARCH = new Date("2026-03-01T12:00:00.000Z");
const APRIL = new Date("2026-04-15T12:00:00.000Z");

describe("Read API for the Receitas/Despesas screens", () => {
  let prisma: PrismaClient;
  let app: Express;
  let accessToken: string;
  let categoryId: string;

  beforeAll(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(MARCH);

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = testDb.url;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "error";
    // Argon2 mínimo: o cadastro do beforeAll faz hash, e o custo de produção só deixaria o teste lento.
    process.env.ARGON2_MEMORY_KIB = "1024";
    process.env.ARGON2_TIME_COST = "1";
    process.env.ARGON2_PARALLELISM = "1";
    process.env.AUTH_RATE_LIMIT_REGISTER_PER_IP = "1000";
    // O relógio falso salta de março para abril: token e sessão precisam sobreviver ao salto.
    process.env.ACCESS_TOKEN_TTL_SECONDS = String(365 * 24 * 60 * 60);
    process.env.SESSION_MAX_LIFETIME_SECONDS = String(365 * 24 * 60 * 60);

    testDb.push();
    prisma = testDb.client();

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();

    const userRes = await request(app)
      .post("/auth/register")
      .send({ name: "Read API User", email: "read-api@example.com", password: PASSWORD });
    accessToken = userRes.body.accessToken;

    const categoryRes = await request(app)
      .post("/expenses/categories")
      .set(auth())
      .send({ name: "Moradia" });
    categoryId = categoryRes.body.id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
    testDb.remove();
  });

  beforeEach(async () => {
    vi.setSystemTime(MARCH);
    await prisma.oneTimeExpense.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.installmentExpense.deleteMany();
    await prisma.recurringExpenseVersion.deleteMany();
    await prisma.recurringExpense.deleteMany();
    await prisma.oneTimeRevenue.deleteMany();
    await prisma.fixedRevenueVersion.deleteMany();
    await prisma.fixedRevenue.deleteMany();
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });
  const get = (url: string, query: Record<string, number | string> = {}) =>
    request(app).get(url).set(auth()).query(query);

  const createRecurring = (body: Record<string, unknown> = {}) =>
    request(app)
      .post("/expenses/recurring")
      .set(auth())
      .send({
        description: "Aluguel",
        amount: 100,
        categoryId,
        startYear: 2026,
        startMonth: 3,
        ...body,
      });

  const createFixed = (body: Record<string, unknown> = {}) =>
    request(app)
      .post("/revenues/fixed")
      .set(auth())
      .send({
        description: "Salário",
        amount: 5000,
        modality: "ALTERABLE",
        startYear: 2026,
        startMonth: 3,
        ...body,
      });

  const createInstallment = (body: Record<string, unknown> = {}) =>
    request(app)
      .post("/expenses/installment")
      .set(auth())
      .send({
        description: "Notebook",
        totalAmount: 100,
        installmentCount: 3,
        startYear: 2026,
        startMonth: 3,
        categoryId,
        ...body,
      });

  describe("GET /expenses/summary", () => {
    it("should return 12 months whose totals match each monthly query", async () => {
      await request(app).post("/expenses/one-time").set(auth()).send({
        description: "Mercado",
        amount: 150.5,
        competenceYear: 2026,
        competenceMonth: 3,
        categoryId,
      });
      await createRecurring({ amount: 2000 });
      await createInstallment({ startMonth: 11 });

      const summary = await get("/expenses/summary", { year: 2026 });

      expect(summary.status).toBe(200);
      expect(summary.body.year).toBe(2026);
      expect(summary.body.reference).toEqual({ year: 2026, month: 3 });
      expect(summary.body.months).toHaveLength(12);
      expect(
        summary.body.months
          .slice(1, 4)
          .map((m: { competenceStatus: string }) => m.competenceStatus),
      ).toEqual(["PAST", "CURRENT", "FUTURE"]);

      for (const entry of summary.body.months) {
        const monthly = await get("/expenses", {
          competenceYear: 2026,
          competenceMonth: entry.month,
        });
        expect(entry.totals).toEqual(monthly.body.totals);
      }
      expect(summary.body.months[2].totals.total).toBe(2150.5);
      expect(summary.body.months[0].totals.total).toBe(0);
    });

    it("should return zeroed future months for a year without entries", async () => {
      const summary = await get("/expenses/summary", { year: 2030 });

      expect(summary.status).toBe(200);
      expect(
        summary.body.months.every((m: { totals: { total: number } }) => m.totals.total === 0),
      ).toBe(true);
      expect(
        summary.body.months.every(
          (m: { competenceStatus: string }) => m.competenceStatus === "FUTURE",
        ),
      ).toBe(true);
    });

    it.each([[{}], [{ year: 1999 }], [{ year: "abc" }]])(
      "should reject %j with 400",
      async (query) => {
        const response = await get("/expenses/summary", query);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("VALIDATION_ERROR");
      },
    );

    it.each(UNAUTHENTICATED)("should return 401 %s", async (_case, headers) => {
      const response = await request(app)
        .get("/expenses/summary")
        .set(headers)
        .query({ year: 2026 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(UNAUTHORIZED_BODY);
    });
  });

  describe("GET /revenues/summary", () => {
    it("should return 12 months whose totals match each monthly query", async () => {
      await request(app).post("/revenues/one-time").set(auth()).send({
        description: "Freelance",
        amount: 800,
        competenceYear: 2026,
        competenceMonth: 4,
      });
      await createFixed({ endYear: 2026, endMonth: 6 });

      const summary = await get("/revenues/summary", { year: 2026 });

      expect(summary.status).toBe(200);
      expect(summary.body.months).toHaveLength(12);
      for (const entry of summary.body.months) {
        const monthly = await get("/revenues", {
          competenceYear: 2026,
          competenceMonth: entry.month,
        });
        expect(entry.totals).toEqual(monthly.body.totals);
      }
      expect(summary.body.months[3].totals).toEqual({
        oneTimeTotal: 800,
        fixedTotal: 5000,
        total: 5800,
      });
      expect(summary.body.months[6].totals.total).toBe(0);
    });

    it("should return 400 when the year is missing", async () => {
      const response = await get("/revenues/summary");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });

    it.each(UNAUTHENTICATED)("should return 401 %s", async (_case, headers) => {
      const response = await request(app)
        .get("/revenues/summary")
        .set(headers)
        .query({ year: 2026 });

      expect(response.status).toBe(401);
      expect(response.body).toEqual(UNAUTHORIZED_BODY);
    });
  });

  describe("monthly queries", () => {
    it("should expose competence status, reference and previous amount of recurring expenses", async () => {
      const created = await createRecurring();
      await request(app)
        .patch(`/expenses/recurring/${created.body.id}`)
        .set(auth())
        .send({ amount: 120, effectiveYear: 2026, effectiveMonth: 5 });

      const [march, may, june] = await Promise.all(
        [3, 5, 6].map((month) =>
          get("/expenses", { competenceYear: 2026, competenceMonth: month }),
        ),
      );

      expect(march.body).toMatchObject({
        competenceStatus: "CURRENT",
        reference: { year: 2026, month: 3 },
      });
      expect(may.body.competenceStatus).toBe("FUTURE");
      expect(march.body.expenses[0].previousAmount).toBeNull();
      expect(may.body.expenses[0]).toMatchObject({ amount: 120, previousAmount: 100 });
      expect(june.body.expenses[0].previousAmount).toBeNull();
    });

    it("should report a past competence", async () => {
      const response = await get("/expenses", { competenceYear: 2026, competenceMonth: 2 });

      expect(response.body).toMatchObject({
        competenceStatus: "PAST",
        reference: { year: 2026, month: 3 },
      });
    });

    it("should expose the last installment competence crossing the year", async () => {
      await createInstallment({ startMonth: 6, installmentCount: 12, totalAmount: 1200 });

      const response = await get("/expenses", { competenceYear: 2026, competenceMonth: 8 });

      expect(response.body.expenses[0]).toMatchObject({
        installmentNumber: 3,
        endYear: 2027,
        endMonth: 5,
      });
    });

    it("should expose previous amount, status and reference on revenues", async () => {
      const created = await createFixed();
      await request(app)
        .patch(`/revenues/fixed/${created.body.id}`)
        .set(auth())
        .send({ description: "Salário", amount: 5500, effectiveYear: 2026, effectiveMonth: 5 });

      const [march, may] = await Promise.all(
        [3, 5].map((month) => get("/revenues", { competenceYear: 2026, competenceMonth: month })),
      );

      expect(march.body).toMatchObject({
        competenceStatus: "CURRENT",
        reference: { year: 2026, month: 3 },
      });
      expect(march.body.fixedRevenues[0].previousAmount).toBeNull();
      expect(may.body.fixedRevenues[0]).toMatchObject({ previousAmount: 5000 });
      expect(may.body.fixedRevenues[0].currentVersion.amount).toBe(5500);
    });
  });

  describe("installment details", () => {
    it("should project status, delete and terminate rules across GET, terminate and DELETE", async () => {
      const created = await createInstallment();
      expect(created.status).toBe(201);
      expect(created.body).toMatchObject({
        endYear: 2026,
        endMonth: 5,
        canDelete: true,
        canTerminate: true,
      });
      expect(created.body.installments.map((i: { status: string }) => i.status)).toEqual([
        "CURRENT",
        "PENDING",
        "PENDING",
      ]);

      vi.setSystemTime(APRIL);
      const detail = await get(`/expenses/installment/${created.body.id}`);

      expect(detail.body.installments.map((i: { status: string }) => i.status)).toEqual([
        "PAID",
        "CURRENT",
        "PENDING",
      ]);
      expect(detail.body).toMatchObject({ canDelete: false, canTerminate: true });

      const refused = await request(app)
        .delete(`/expenses/installment/${created.body.id}`)
        .set(auth());
      expect(refused.body.error).toBe("INSTALLMENT_HAS_PAST_COMPETENCE");

      const terminated = await request(app)
        .post(`/expenses/installment/${created.body.id}/terminate`)
        .set(auth());
      expect(terminated.status).toBe(200);
      expect(terminated.body.installments.map((i: { status: string }) => i.status)).toEqual([
        "PAID",
        "CURRENT",
      ]);
      expect(terminated.body).toMatchObject({ canDelete: false, canTerminate: false });

      const again = await request(app)
        .post(`/expenses/installment/${created.body.id}/terminate`)
        .set(auth());
      expect(again.body.error).toBe("NO_FUTURE_INSTALLMENTS");
    });

    it("should list installment plans with the projected fields", async () => {
      await createInstallment();

      const list = await get("/expenses/installment");

      expect(list.status).toBe(200);
      expect(list.body[0]).toMatchObject({ canDelete: true, canTerminate: true, endMonth: 5 });
    });
  });

  describe("series details", () => {
    it("should flag an expired recurring expense and refuse to terminate it", async () => {
      const created = await createRecurring({ endYear: 2026, endMonth: 3 });
      expect(created.body).toMatchObject({ isExpired: false, reference: { year: 2026, month: 3 } });

      vi.setSystemTime(APRIL);
      const detail = await get(`/expenses/recurring/${created.body.id}`);

      expect(detail.body).toMatchObject({ isExpired: true, reference: { year: 2026, month: 4 } });
      const refused = await request(app)
        .patch(`/expenses/recurring/${created.body.id}/terminate`)
        .set(auth())
        .send({ endYear: 2026, endMonth: 6 });
      expect(refused.body.error).toBe("RECURRING_EXPENSE_ALREADY_EXPIRED");
    });

    it("should flag an expired fixed revenue and always return its versions by id", async () => {
      const ended = await createFixed({ endYear: 2026, endMonth: 3 });
      const open = await createFixed({ description: "Aluguel recebido" });

      vi.setSystemTime(APRIL);
      const [endedDetail, openDetail] = await Promise.all([
        get(`/revenues/fixed/${ended.body.id}`),
        get(`/revenues/fixed/${open.body.id}`),
      ]);

      expect(endedDetail.body).toMatchObject({
        isExpired: true,
        reference: { year: 2026, month: 4 },
      });
      expect(openDetail.body.isExpired).toBe(false);
      expect(openDetail.body.versions).toHaveLength(1);
      expect(openDetail.body.currentVersion.description).toBe("Aluguel recebido");
    });

    it("should keep the existing list routes out of the summary route", async () => {
      await createRecurring();
      await createFixed();

      const [recurring, fixed] = await Promise.all([
        get("/expenses/recurring"),
        get("/revenues/fixed"),
      ]);

      expect(recurring.status).toBe(200);
      expect(Array.isArray(recurring.body)).toBe(true);
      expect(recurring.body[0].isExpired).toBe(false);
      expect(fixed.status).toBe(200);
      expect(Array.isArray(fixed.body)).toBe(true);
    });
  });
});
