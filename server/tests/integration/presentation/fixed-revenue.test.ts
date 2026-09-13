import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import type { Express } from "express";

const TEST_DB_URL = "file:./test-fixed-revenue.db";
const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Fixed Revenue Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let userId: string;

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
      name: "Fixed Revenue User",
      email: "fixed-revenue-user@example.com",
    });
    userId = createUserRes.body.id;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
    const { unlinkSync, existsSync } = await import("fs");
    const dbPath = TEST_DB_URL.replace("file:", "").replace("./", "prisma/");
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  beforeEach(async () => {
    await prisma.fixedRevenueVersion.deleteMany();
    await prisma.fixedRevenue.deleteMany();
  });

  const authHeaders = () => ({ "X-User-Id": userId });

  const createSalary = async () =>
    request(app).post("/revenues/fixed").set(authHeaders()).send({
      description: "Salário",
      amount: 8500,
      modality: "ALTERABLE",
      startMonth: 3,
      startYear: 2026,
    });

  it("should expose versions and currentVersion when listing fixed revenues", async () => {
    const createRes = await createSalary();
    expect(createRes.status).toBe(201);

    const listRes = await request(app).get("/revenues/fixed").set(authHeaders());

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].versions).toHaveLength(1);
    expect(listRes.body[0].currentVersion).toMatchObject({
      description: "Salário",
      amount: 8500,
      effectiveMonth: 3,
      effectiveYear: 2026,
    });
  });

  it("should return every version and keep currentVersion on the one in effect today", async () => {
    const createRes = await createSalary();

    const versionRes = await request(app)
      .patch(`/revenues/fixed/${createRes.body.id}`)
      .set(authHeaders())
      .send({
        description: "Salário (reajuste)",
        amount: 9200,
        effectiveMonth: 6,
        effectiveYear: 2026,
      });
    expect(versionRes.status).toBe(200);

    const listRes = await request(app).get("/revenues/fixed").set(authHeaders());

    expect(listRes.body[0].versions).toHaveLength(2);
    // Hoje é março/2026: a versão de junho ainda não vale.
    expect(listRes.body[0].currentVersion.amount).toBe(8500);
    expect(listRes.body[0].versions.map((v: { amount: number }) => v.amount)).toEqual([8500, 9200]);
  });

  it("should fall back to the first version when the revenue has not started yet", async () => {
    const createRes = await request(app).post("/revenues/fixed").set(authHeaders()).send({
      description: "Aluguel recebido",
      amount: 1200,
      modality: "UNALTERABLE",
      startMonth: 9,
      startYear: 2026,
    });
    expect(createRes.status).toBe(201);

    const listRes = await request(app).get("/revenues/fixed").set(authHeaders());

    expect(listRes.body[0].currentVersion).toMatchObject({
      description: "Aluguel recebido",
      amount: 1200,
    });
  });
});
