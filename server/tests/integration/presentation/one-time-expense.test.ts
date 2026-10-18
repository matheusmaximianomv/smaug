import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("one-time-expense");
const PASSWORD = "correct-horse-battery-staple";

describe("One-Time Expense Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;
  let accessToken: string;
  let categoryId: string;

  beforeAll(async () => {
    vi.resetModules();

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

    testDb.push();
    prisma = testDb.client();

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();

    const createUserRes = await request(app)
      .post("/auth/register")
      .send({ name: "Test User", email: "test-user-expense@example.com", password: PASSWORD });
    userId = createUserRes.body.user.id;
    accessToken = createUserRes.body.accessToken;

    const categoryRes = await request(app).post("/expenses/categories").set(authHeaders()).send({
      name: "Alimentação",
    });
    categoryId = categoryRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  beforeEach(async () => {
    await prisma.oneTimeExpense.deleteMany();
  });

  const authHeaders = () => ({ Authorization: `Bearer ${accessToken}` });

  const futureCompetence = (monthsAhead: number) => {
    // UTC, como MonthlyCompetence.isPastMonth(): em hora local o teste quebra na virada do mês.
    const now = new Date();
    const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 1));
    return { competenceYear: target.getUTCFullYear(), competenceMonth: target.getUTCMonth() + 1 };
  };

  it("should create, list, update, and delete a one-time expense when data is valid", async () => {
    const createRes = await request(app)
      .post("/expenses/one-time")
      .set(authHeaders())
      .send({
        description: "Jantar",
        amount: 150,
        ...futureCompetence(0),
        categoryId,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.category.id).toBe(categoryId);

    const listRes = await request(app)
      .get("/expenses/one-time")
      .query(futureCompetence(0))
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
      .query(futureCompetence(0))
      .set(authHeaders());
    expect(listAfterDeleteRes.status).toBe(200);
    expect(listAfterDeleteRes.body).toHaveLength(0);
  });

  it("should list every expense of the user when no competence filter is provided", async () => {
    const competences = [futureCompetence(1), futureCompetence(4)];

    for (const competence of competences) {
      const res = await request(app)
        .post("/expenses/one-time")
        .set(authHeaders())
        .send({ description: "Mercado", amount: 100, categoryId, ...competence });
      expect(res.status).toBe(201);
    }

    const listRes = await request(app).get("/expenses/one-time").set(authHeaders());

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
  });

  it("should return 400 when only one part of the competence filter is provided", async () => {
    const res = await request(app)
      .get("/expenses/one-time")
      .query({ competenceYear: 2026 })
      .set(authHeaders());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("should return 409 when creating an expense for past competence", async () => {
    const res = await request(app).post("/expenses/one-time").set(authHeaders()).send({
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
    const otherUserRes = await request(app)
      .post("/auth/register")
      .send({ name: "Other User", email: "other-user-expense@example.com", password: PASSWORD });
    const otherAuth = { Authorization: `Bearer ${otherUserRes.body.accessToken}` };

    const otherCategoryRes = await request(app).post("/expenses/categories").set(otherAuth).send({
      name: "Transporte",
    });
    const otherCategoryId = otherCategoryRes.body.id;

    const otherExpenseRes = await request(app)
      .post("/expenses/one-time")
      .set(otherAuth)
      .send({
        description: "Uber",
        amount: 60,
        ...futureCompetence(2),
        categoryId: otherCategoryId,
      });
    expect(otherExpenseRes.status).toBe(201);

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
