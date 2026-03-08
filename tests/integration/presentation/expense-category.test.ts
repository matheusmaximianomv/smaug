import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-expense-category.db";

describe("Expense Category Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;

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
      email: "test-user@example.com",
    });
    userId = createUserRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.expenseCategory.deleteMany();
    await prisma.oneTimeExpense.deleteMany();
    await prisma.installmentExpense.deleteMany();
    await prisma.recurringExpense.deleteMany();
    await prisma.recurringExpenseVersion.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  it("should create, list, get, update, and delete an expense category", async () => {
    const createRes = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Transporte" });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe("Transporte");

    const listRes = await request(app).get("/expenses/categories").set(authHeaders());
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].name).toBe("Transporte");

    const getRes = await request(app)
      .get(`/expenses/categories/${createRes.body.id}`)
      .set(authHeaders());
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe("Transporte");

    const updateRes = await request(app)
      .put(`/expenses/categories/${createRes.body.id}`)
      .set(authHeaders())
      .send({ name: "Essenciais" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe("Essenciais");

    const deleteRes = await request(app)
      .delete(`/expenses/categories/${createRes.body.id}`)
      .set(authHeaders());
    expect(deleteRes.status).toBe(204);

    const listAfterDeleteRes = await request(app).get("/expenses/categories").set(authHeaders());
    expect(listAfterDeleteRes.status).toBe(200);
    expect(listAfterDeleteRes.body).toHaveLength(0);
  });

  it("should return 409 when creating category with duplicate name", async () => {
    await request(app).post("/expenses/categories").set(authHeaders()).send({ name: "Transporte" });

    const duplicateRes = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "transporte" });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.error).toBe("EXPENSE_CATEGORY_NAME_ALREADY_EXISTS");
  });

  it("should block deletion when category has linked one-time expenses", async () => {
    const categoryRes = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Alimentação" });
    const categoryId = categoryRes.body.id;

    await prisma.oneTimeExpense.create({
      data: {
        id: "expense-1",
        userId,
        categoryId,
        description: "Jantar",
        amount: 120,
        competenceYear: 2026,
        competenceMonth: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const res = await request(app)
      .delete(`/expenses/categories/${categoryId}`)
      .set(authHeaders());
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("EXPENSE_CATEGORY_HAS_LINKED_EXPENSES");
  });
});
