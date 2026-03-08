import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-expense-query.db";
const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Expense Query Endpoint", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;
  let foodCategoryId: string;
  let homeCategoryId: string;

  beforeAll(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "error";

    prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });

    const { execSync } = await import("child_process");
    execSync(`DATABASE_URL=${TEST_DB_URL} npx prisma db push --force-reset --skip-generate`, {
      cwd: process.cwd(),
      stdio: "pipe",
    });

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();

    const createUserRes = await request(app).post("/users").send({
      name: "Expense Query User",
      email: "expense-query@example.com",
    });
    userId = createUserRes.body.id;

    const foodCategoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": userId })
      .send({ name: "Alimentação" });
    foodCategoryId = foodCategoryRes.body.id;

    const homeCategoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": userId })
      .send({ name: "Moradia" });
    homeCategoryId = homeCategoryRes.body.id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.oneTimeExpense.deleteMany();
    await prisma.installment.deleteMany();
    await prisma.installmentExpense.deleteMany();
    await prisma.recurringExpenseVersion.deleteMany();
    await prisma.recurringExpense.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  it("should return consolidated expenses for the specified competence", async () => {
    const oneTimeRes = await request(app)
      .post("/expenses/one-time")
      .set(authHeaders())
      .send({
        description: "Jantar",
        amount: 150,
        competenceYear: 2026,
        competenceMonth: 3,
        categoryId: foodCategoryId,
      });
    expect(oneTimeRes.status).toBe(201);

    const installmentRes = await request(app)
      .post("/expenses/installment")
      .set(authHeaders())
      .send({
        description: "Notebook",
        totalAmount: 1000,
        installmentCount: 3,
        startYear: 2026,
        startMonth: 3,
        categoryId: foodCategoryId,
      });
    expect(installmentRes.status).toBe(201);

    const recurringRes = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Aluguel",
        amount: 2000,
        categoryId: homeCategoryId,
        startYear: 2026,
        startMonth: 3,
      });
    expect(recurringRes.status).toBe(201);

    const response = await request(app)
      .get("/expenses")
      .set(authHeaders())
      .query({ competenceYear: 2026, competenceMonth: 3 });

    expect(response.status).toBe(200);
    expect(response.body.expenses).toHaveLength(3); // 1 one-time + 1 installment + 1 recurring

    const types = response.body.expenses.reduce(
      (acc: Record<string, number>, expense: { type: string }) => {
        acc[expense.type] = (acc[expense.type] ?? 0) + 1;
        return acc;
      },
      {},
    );

    expect(types.ONE_TIME).toBe(1);
    expect(types.INSTALLMENT).toBe(1);
    expect(types.RECURRING).toBe(1);

    expect(response.body.totals.oneTime).toBe(150);
    expect(response.body.totals.installment).toBeCloseTo(333.34, 2);
    expect(response.body.totals.recurring).toBe(2000);
    expect(response.body.totals.total).toBeCloseTo(2483.34, 2);

    const installmentExpense = response.body.expenses.find(
      (expense: { type: string }) => expense.type === "INSTALLMENT",
    );
    expect(installmentExpense).toMatchObject({
      installmentExpenseId: installmentRes.body.id,
      totalAmount: 1000,
      installmentCount: 3,
    });

    const recurringExpense = response.body.expenses.find(
      (expense: { type: string }) => expense.type === "RECURRING",
    );
    expect(recurringExpense.category.id).toBe(homeCategoryId);
  });

  it("should return empty list when no expenses exist", async () => {
    const response = await request(app)
      .get("/expenses")
      .set(authHeaders())
      .query({ competenceYear: 2026, competenceMonth: 10 });

    expect(response.status).toBe(200);
    expect(response.body.expenses).toHaveLength(0);
    expect(response.body.totals).toEqual({ oneTime: 0, installment: 0, recurring: 0, total: 0 });
  });
});
