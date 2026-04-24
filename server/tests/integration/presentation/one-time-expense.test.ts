import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-one-time-expense.db";

describe("One-Time Expense Endpoints", () => {
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
      name: "Test User",
      email: "test-user-expense@example.com",
    });
    userId = createUserRes.body.id;

    const categoryRes = await request(app).post("/expenses/categories").set({ "X-User-Id": userId }).send({
      name: "Alimentação",
    });
    categoryId = categoryRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.oneTimeExpense.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  it("should create, list, update, and delete a one-time expense when data is valid", async () => {
    const createRes = await request(app)
      .post("/expenses/one-time")
      .set(authHeaders())
      .send({
        description: "Jantar",
        amount: 150,
        competenceYear: 2026,
        competenceMonth: 4,
        categoryId,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.category.id).toBe(categoryId);

    const listRes = await request(app)
      .get("/expenses/one-time")
      .query({ competenceYear: 2026, competenceMonth: 4 })
      .set(authHeaders());
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].description).toBe("Jantar");

    const updateRes = await request(app)
      .put(`/expenses/one-time/${createRes.body.id}`)
      .set(authHeaders())
      .send({ description: "Mercado", amount: 200 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.description).toBe("Mercado");
    expect(updateRes.body.amount).toBe(200);

    const deleteRes = await request(app)
      .delete(`/expenses/one-time/${createRes.body.id}`)
      .set(authHeaders());
    expect(deleteRes.status).toBe(204);

    const listAfterDeleteRes = await request(app)
      .get("/expenses/one-time")
      .query({ competenceYear: 2026, competenceMonth: 4 })
      .set(authHeaders());
    expect(listAfterDeleteRes.status).toBe(200);
    expect(listAfterDeleteRes.body).toHaveLength(0);
  });

  it("should return 409 when creating an expense for past competence", async () => {
    const res = await request(app)
      .post("/expenses/one-time")
      .set(authHeaders())
      .send({
        description: "Compra",
        amount: 100,
        competenceYear: 2025,
        competenceMonth: 1,
        categoryId,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("PAST_COMPETENCE");
  });

  it("should return 404 when updating expense from another user", async () => {
    const otherUserRes = await request(app).post("/users").send({
      name: "Other User",
      email: "other-user-expense@example.com",
    });
    const otherUserId = otherUserRes.body.id;

    const otherCategoryRes = await request(app).post("/expenses/categories").set({ "X-User-Id": otherUserId }).send({
      name: "Transporte",
    });
    const otherCategoryId = otherCategoryRes.body.id;

    const otherExpenseRes = await request(app)
      .post("/expenses/one-time")
      .set({ "X-User-Id": otherUserId })
      .send({
        description: "Uber",
        amount: 60,
        competenceYear: 2026,
        competenceMonth: 6,
        categoryId: otherCategoryId,
      });

    const res = await request(app)
      .put(`/expenses/one-time/${otherExpenseRes.body.id}`)
      .set(authHeaders())
      .send({ description: "Uber Not", amount: 80 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("ONE_TIME_EXPENSE_NOT_FOUND");
  });

  it("should return 409 when deleting expense for a past competence", async () => {
    const pastExpense = await prisma.oneTimeExpense.create({
      data: {
        id: "expense-past",
        userId,
        categoryId,
        description: "Velha",
        amount: 30,
        competenceYear: 2025,
        competenceMonth: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const res = await request(app)
      .delete(`/expenses/one-time/${pastExpense.id}`)
      .set(authHeaders());

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("PAST_COMPETENCE");
  });
});
