import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-installment-expense.db";

describe("Installment Expense Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;
  let categoryId: string;

  beforeAll(async () => {
    vi.resetModules();

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
      name: "Installment User",
      email: "installment-user@example.com",
    });
    userId = createUserRes.body.id;

    const categoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": userId })
      .send({ name: "Eletrônicos" });
    categoryId = categoryRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.installment.deleteMany();
    await prisma.installmentExpense.deleteMany();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  it("should create, list, get, update, terminate, and delete an installment expense", async () => {
    const createRes = await request(app)
      .post("/expenses/installment")
      .set(authHeaders())
      .send({
        description: "Notebook",
        totalAmount: 1000,
        installmentCount: 3,
        startYear: 2026,
        startMonth: 4,
        categoryId,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.description).toBe("Notebook");
    expect(createRes.body.installments).toHaveLength(3);

    const listRes = await request(app).get("/expenses/installment").set(authHeaders());
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const getRes = await request(app)
      .get(`/expenses/installment/${createRes.body.id}`)
      .set(authHeaders());
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(createRes.body.id);

    const newCategoryRes = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Informática" });
    const newCategoryId = newCategoryRes.body.id;

    const updateRes = await request(app)
      .patch(`/expenses/installment/${createRes.body.id}`)
      .set(authHeaders())
      .send({ description: "Notebook atualizado", categoryId: newCategoryId });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.description).toBe("Notebook atualizado");
    expect(updateRes.body.category.id).toBe(newCategoryId);

    const terminateRes = await request(app)
      .post(`/expenses/installment/${createRes.body.id}/terminate`)
      .set(authHeaders())
      .send();
    expect(terminateRes.status).toBe(200);
    expect(terminateRes.body.installments.length).toBeLessThan(3);

    const deleteRes = await request(app)
      .delete(`/expenses/installment/${createRes.body.id}`)
      .set(authHeaders());
    expect(deleteRes.status).toBe(204);

    const listAfterDeleteRes = await request(app).get("/expenses/installment").set(authHeaders());
    expect(listAfterDeleteRes.status).toBe(200);
    expect(listAfterDeleteRes.body).toHaveLength(0);
  });

  it("should return 409 when creating an installment expense with past start competence", async () => {
    const res = await request(app)
      .post("/expenses/installment")
      .set(authHeaders())
      .send({
        description: "Passada",
        totalAmount: 200,
        installmentCount: 2,
        startYear: 2020,
        startMonth: 5,
        categoryId,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("PAST_COMPETENCE");
  });

  it("should return 409 when terminating installment expense without future installments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));

    const expense = await prisma.installmentExpense.create({
      data: {
        id: "installment-no-future",
        userId,
        categoryId,
        description: "Curso",
        totalAmount: 300,
        installmentCount: 2,
        startYear: 2026,
        startMonth: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
        installments: {
          create: [
            {
              id: "installment-no-future-1",
              installmentNumber: 1,
              amount: 150,
              competenceYear: 2026,
              competenceMonth: 4,
              createdAt: new Date(),
            },
            {
              id: "installment-no-future-2",
              installmentNumber: 2,
              amount: 150,
              competenceYear: 2026,
              competenceMonth: 5,
              createdAt: new Date(),
            },
          ],
        },
      },
    });

    const res = await request(app)
      .post(`/expenses/installment/${expense.id}/terminate`)
      .set(authHeaders())
      .send();

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("NO_FUTURE_INSTALLMENTS");
  });

  it("should return 409 when deleting installment expense with past installments", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));

    const expense = await prisma.installmentExpense.create({
      data: {
        id: "installment-with-past",
        userId,
        categoryId,
        description: "Academia",
        totalAmount: 300,
        installmentCount: 3,
        startYear: 2026,
        startMonth: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        installments: {
          create: [
            {
              id: "installment-with-past-1",
              installmentNumber: 1,
              amount: 100,
              competenceYear: 2026,
              competenceMonth: 3,
              createdAt: new Date(),
            },
            {
              id: "installment-with-past-2",
              installmentNumber: 2,
              amount: 100,
              competenceYear: 2026,
              competenceMonth: 4,
              createdAt: new Date(),
            },
            {
              id: "installment-with-past-3",
              installmentNumber: 3,
              amount: 100,
              competenceYear: 2026,
              competenceMonth: 5,
              createdAt: new Date(),
            },
          ],
        },
      },
    });

    const res = await request(app)
      .delete(`/expenses/installment/${expense.id}`)
      .set(authHeaders());

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("INSTALLMENT_HAS_PAST_COMPETENCE");
  });

  it("should return 404 when accessing installment expense from another user", async () => {
    const otherUserRes = await request(app).post("/users").send({
      name: "Another User",
      email: "another-user@example.com",
    });
    const otherUserId = otherUserRes.body.id;

    const otherCategoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": otherUserId })
      .send({ name: "Viagem" });
    const otherCategoryId = otherCategoryRes.body.id;

    const otherExpenseRes = await request(app)
      .post("/expenses/installment")
      .set({ "X-User-Id": otherUserId })
      .send({
        description: "Viagem",
        totalAmount: 600,
        installmentCount: 3,
        startYear: 2026,
        startMonth: 7,
        categoryId: otherCategoryId,
      });

    const res = await request(app)
      .get(`/expenses/installment/${otherExpenseRes.body.id}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("INSTALLMENT_EXPENSE_NOT_FOUND");
  });
});
