import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("fixed-revenue");
const PASSWORD = "correct-horse-battery-staple";
const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Fixed Revenue Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  let accessToken: string;

  beforeAll(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

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
      .send({
        name: "Fixed Revenue User",
        email: "fixed-revenue-user@example.com",
        password: PASSWORD,
      });
    accessToken = createUserRes.body.accessToken;
  });

  afterAll(async () => {
    vi.useRealTimers();
    await prisma.$disconnect();
    testDb.remove();
  });

  beforeEach(async () => {
    await prisma.fixedRevenueVersion.deleteMany();
    await prisma.fixedRevenue.deleteMany();
  });

  const authHeaders = () => ({ Authorization: `Bearer ${accessToken}` });

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
