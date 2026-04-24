import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-recurring-expense.db";
const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Recurring Expense Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;
  let categoryId: string;

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
      name: "Recurring User",
      email: "recurring-user@example.com",
    });
    userId = createUserRes.body.id;

    const categoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": userId })
      .send({ name: "Moradia" });
    categoryId = categoryRes.body.id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.recurringExpenseVersion.deleteMany();
    await prisma.recurringExpense.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  it("should create, list, get, update, terminate, and delete a recurring expense", async () => {
    const createRes = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Aluguel",
        amount: 2000,
        categoryId,
        startYear: 2026,
        startMonth: 4,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.currentVersion.description).toBe("Aluguel");
    expect(createRes.body.versions).toHaveLength(1);

    const listRes = await request(app).get("/expenses/recurring").set(authHeaders());
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);

    const getRes = await request(app)
      .get(`/expenses/recurring/${createRes.body.id}`)
      .set(authHeaders());
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(createRes.body.id);

    const newCategoryRes = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Serviços" });
    const newCategoryId = newCategoryRes.body.id;

    const updateRes = await request(app)
      .patch(`/expenses/recurring/${createRes.body.id}`)
      .set(authHeaders())
      .send({
        description: "Aluguel reajustado",
        amount: 2100,
        categoryId: newCategoryId,
        effectiveYear: 2026,
        effectiveMonth: 5,
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.versions).toHaveLength(2);
    expect(updateRes.body.currentVersion.description).toBe("Aluguel reajustado");
    expect(updateRes.body.currentVersion.category.id).toBe(newCategoryId);

    const terminateRes = await request(app)
      .patch(`/expenses/recurring/${createRes.body.id}/terminate`)
      .set(authHeaders())
      .send({ endYear: 2026, endMonth: 6 });
    expect(terminateRes.status).toBe(200);
    expect(terminateRes.body.endYear).toBe(2026);
    expect(terminateRes.body.endMonth).toBe(6);

    const deleteRes = await request(app)
      .delete(`/expenses/recurring/${createRes.body.id}`)
      .set(authHeaders());
    expect(deleteRes.status).toBe(204);

    const listAfterDelete = await request(app).get("/expenses/recurring").set(authHeaders());
    expect(listAfterDelete.status).toBe(200);
    expect(listAfterDelete.body).toHaveLength(0);
  });

  it("should return 409 when creating recurring expense in past competence", async () => {
    const res = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Seguro",
        amount: 300,
        categoryId,
        startYear: 2026,
        startMonth: 2,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("PAST_COMPETENCE");
  });

  it("should return 409 when updating with past effective competence", async () => {
    const createRes = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Academia",
        amount: 150,
        categoryId,
        startYear: 2026,
        startMonth: 4,
      });

    const res = await request(app)
      .patch(`/expenses/recurring/${createRes.body.id}`)
      .set(authHeaders())
      .send({
        description: "Academia",
        effectiveYear: 2026,
        effectiveMonth: 3,
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("EFFECTIVE_DATE_OUT_OF_RANGE");
  });

  it("should return 409 when terminating with end date before start", async () => {
    const createRes = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Internet",
        amount: 120,
        categoryId,
        startYear: 2026,
        startMonth: 4,
      });

    const res = await request(app)
      .patch(`/expenses/recurring/${createRes.body.id}/terminate`)
      .set(authHeaders())
      .send({ endYear: 2026, endMonth: 3 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("END_DATE_BEFORE_START");
  });

  it("should return 404 when accessing recurring expense from another user", async () => {
    const otherUserRes = await request(app).post("/users").send({
      name: "Other User",
      email: "other-recurring@example.com",
    });
    const otherUserId = otherUserRes.body.id;

    const otherCategoryRes = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": otherUserId })
      .send({ name: "Transporte" });
    const otherCategoryId = otherCategoryRes.body.id;

    const otherExpenseRes = await request(app)
      .post("/expenses/recurring")
      .set({ "X-User-Id": otherUserId })
      .send({
        description: "Carro",
        amount: 800,
        categoryId: otherCategoryId,
        startYear: 2026,
        startMonth: 4,
      });

    const res = await request(app)
      .get(`/expenses/recurring/${otherExpenseRes.body.id}`)
      .set(authHeaders());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("RECURRING_EXPENSE_NOT_FOUND");
  });
});
