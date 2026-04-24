import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-recurring-expense-history.db";
const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Recurring Expense History Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;
  let baseCategoryId: string;

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

    const userResponse = await request(app).post("/users").send({
      name: "Recurring History User",
      email: "recurring-history-user@example.com",
    });
    userId = userResponse.body.id;

    const categoryResponse = await request(app)
      .post("/expenses/categories")
      .set({ "X-User-Id": userId })
      .send({ name: "Essenciais" });
    baseCategoryId = categoryResponse.body.id;
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

  it("should return complete version history when fetching recurring expense after multiple updates", async () => {
    const createResponse = await request(app)
      .post("/expenses/recurring")
      .set(authHeaders())
      .send({
        description: "Aluguel",
        amount: 2000,
        categoryId: baseCategoryId,
        startYear: 2026,
        startMonth: 4,
      });

    expect(createResponse.status).toBe(201);

    const secondCategoryResponse = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Serviços" });
    const secondCategoryId = secondCategoryResponse.body.id;

    const updateResponse = await request(app)
      .patch(`/expenses/recurring/${createResponse.body.id}`)
      .set(authHeaders())
      .send({
        description: "Aluguel reajustado",
        amount: 2100,
        categoryId: secondCategoryId,
        effectiveYear: 2026,
        effectiveMonth: 6,
      });

    expect(updateResponse.status).toBe(200);

    const thirdCategoryResponse = await request(app)
      .post("/expenses/categories")
      .set(authHeaders())
      .send({ name: "Condomínio" });
    const thirdCategoryId = thirdCategoryResponse.body.id;

    const secondUpdateResponse = await request(app)
      .patch(`/expenses/recurring/${createResponse.body.id}`)
      .set(authHeaders())
      .send({
        description: "Aluguel com condomínio",
        amount: 2400,
        categoryId: thirdCategoryId,
        effectiveYear: 2026,
        effectiveMonth: 8,
      });

    expect(secondUpdateResponse.status).toBe(200);

    const historyResponse = await request(app)
      .get(`/expenses/recurring/${createResponse.body.id}`)
      .set(authHeaders());

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.versions).toHaveLength(3);

    const [initialVersion, secondVersion, latestVersion] = historyResponse.body.versions;

    expect(initialVersion.description).toBe("Aluguel");
    expect(initialVersion.effectiveYear).toBe(2026);
    expect(initialVersion.effectiveMonth).toBe(4);
    expect(initialVersion.category.name).toBe("Essenciais");

    expect(secondVersion.description).toBe("Aluguel reajustado");
    expect(secondVersion.effectiveYear).toBe(2026);
    expect(secondVersion.effectiveMonth).toBe(6);
    expect(secondVersion.category.name).toBe("Serviços");

    expect(latestVersion.description).toBe("Aluguel com condomínio");
    expect(latestVersion.effectiveYear).toBe(2026);
    expect(latestVersion.effectiveMonth).toBe(8);
    expect(latestVersion.category.name).toBe("Condomínio");

    expect(historyResponse.body.currentVersion.id).toBe(latestVersion.id);
  });
});
