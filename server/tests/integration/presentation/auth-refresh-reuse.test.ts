import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("auth-refresh-reuse");
const WEB_ORIGIN = "http://localhost:3001";
const PASSWORD = "correct horse battery staple";
const EMAIL = "reuse@smaug.test";

// Janela zero: qualquer reapresentação de um token já rotacionado é reuso (§8.2), sem esperar
// 30 s de relógio. O env é fixado antes do import dinâmico do app.
const ENV: Record<string, string | undefined> = {
  DATABASE_PROVIDER: "sqlite",
  DATABASE_URL: testDb.url,
  NODE_ENV: "test",
  PORT: "3000",
  LOG_LEVEL: "error",
  CORS_ORIGIN: WEB_ORIGIN,
  ARGON2_MEMORY_KIB: "1024",
  ARGON2_TIME_COST: "1",
  ARGON2_PARALLELISM: "1",
  REFRESH_REUSE_GRACE_SECONDS: "0",
  TRUST_PROXY: undefined,
  AUTH_RATE_LIMIT_REGISTER_PER_IP: "1000",
  AUTH_RATE_LIMIT_LOGIN_PER_IP: "1000",
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: "1000",
  AUTH_RATE_LIMIT_REFRESH_PER_IP: "1000",
};

const refreshCookieOf = (res: request.Response): string | undefined =>
  ([] as string[])
    .concat(res.headers["set-cookie"] ?? [])
    .find((value) => value.startsWith("smaug_refresh="));
const cookiePair = (res: request.Response): string => {
  const cookie = refreshCookieOf(res);
  if (!cookie) throw new Error("smaug_refresh cookie not set");
  return cookie.split(";")[0]!;
};

describe("Auth refresh token reuse (grace window = 0)", () => {
  let prisma: PrismaClient;
  let app: Express;
  const previousEnv: Record<string, string | undefined> = {};

  const refresh = (pair: string) =>
    request(app).post("/auth/refresh").set("Origin", WEB_ORIGIN).set("Cookie", pair);
  const me = (accessToken: string) =>
    request(app).get("/users/me").set("Authorization", `Bearer ${accessToken}`);

  beforeAll(async () => {
    vi.resetModules();

    for (const [key, value] of Object.entries(ENV)) {
      previousEnv[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    testDb.push();
    prisma = testDb.client();

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("should revoke the token family on reuse and keep the user's other sessions", async () => {
    const deviceA = await request(app)
      .post("/auth/register")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "Smaug", email: EMAIL, password: PASSWORD });
    expect(deviceA.status).toBe(201);
    const deviceB = await request(app)
      .post("/auth/login")
      .set("Origin", WEB_ORIGIN)
      .send({ email: EMAIL, password: PASSWORD });
    expect(deviceB.status).toBe(200);

    const t1 = cookiePair(deviceA);
    const rotated = await refresh(t1);
    expect(rotated.status).toBe(200);
    const t2 = cookiePair(rotated);

    // A janela é inclusiva (`<=`): no mesmo milissegundo da rotação ainda seria 409.
    await new Promise((resolve) => setTimeout(resolve, 5));

    const reused = await refresh(t1);
    expect(reused.status).toBe(401);
    expect(reused.body.error).toBe("INVALID_REFRESH_TOKEN");
    expect(refreshCookieOf(reused)).toMatch(/^smaug_refresh=;/);

    const successor = await refresh(t2);
    expect(successor.status).toBe(401);
    expect(successor.body.error).toBe("INVALID_REFRESH_TOKEN");

    expect((await me(rotated.body.accessToken)).status).toBe(401);
    expect((await me(deviceA.body.accessToken)).status).toBe(401);

    const sessions = await prisma.authSession.findMany({
      where: { userId: deviceA.body.user.id },
      include: { refreshTokens: true },
    });
    const compromised = sessions.find((session) =>
      session.refreshTokens.some((token) => token.parentTokenId !== null),
    )!;
    expect(compromised.status).toBe("REVOKED");
    expect(compromised.revokedReason).toBe("REFRESH_TOKEN_REUSE");
    expect(compromised.refreshTokens.filter((token) => token.status === "ACTIVE")).toHaveLength(0);

    expect((await me(deviceB.body.accessToken)).status).toBe(200);
    expect((await refresh(cookiePair(deviceB))).status).toBe(200);
  });
});
