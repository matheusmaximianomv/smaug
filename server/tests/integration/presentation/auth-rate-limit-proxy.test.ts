import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("auth-rate-limit-proxy");
const WEB_ORIGIN = "http://localhost:3001";
const PASSWORD = "correct horse battery staple";
const CLIENT_A = "203.0.113.10";
const CLIENT_B = "203.0.113.20";

// O Supertest conecta por loopback, que faz o papel do servidor do web: com ele confiável, o IP
// do cliente vem do X-Forwarded-For e cada cliente tem o próprio balde.
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
  TRUST_PROXY: "loopback",
  AUTH_RATE_LIMIT_REGISTER_PER_IP: "1",
  AUTH_RATE_LIMIT_LOGIN_PER_IP: "1",
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: "1",
  AUTH_RATE_LIMIT_REFRESH_PER_IP: "1",
};

const expectTooManyRequests = (res: request.Response): void => {
  expect(res.status).toBe(429);
  expect(res.body).toEqual({ error: "TOO_MANY_REQUESTS", message: expect.any(String) });
  expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
};

describe("Auth rate limit behind a trusted proxy", () => {
  let app: Express;
  const previousEnv: Record<string, string | undefined> = {};

  beforeAll(async () => {
    vi.resetModules();

    for (const [key, value] of Object.entries(ENV)) {
      previousEnv[key] = process.env[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }

    testDb.push();

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();
  });

  afterAll(() => {
    testDb.remove();
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const register = (client: string, email: string) =>
    request(app)
      .post("/auth/register")
      .set("X-Forwarded-For", client)
      .send({ name: "Smaug", email, password: PASSWORD });
  const login = (client: string, email: string) =>
    request(app)
      .post("/auth/login")
      .set("X-Forwarded-For", client)
      .send({ email, password: PASSWORD });
  const refresh = (client: string) =>
    request(app).post("/auth/refresh").set("X-Forwarded-For", client);

  it("should count registrations per forwarded client IP", async () => {
    expect((await register(CLIENT_A, "a@smaug.test")).status).toBe(201);
    expectTooManyRequests(await register(CLIENT_A, "a2@smaug.test"));

    expect((await register(CLIENT_B, "b@smaug.test")).status).toBe(201);
  });

  it("should count logins per forwarded client IP", async () => {
    expect((await login(CLIENT_A, "a@smaug.test")).status).toBe(200);
    expectTooManyRequests(await login(CLIENT_A, "b@smaug.test"));

    expect((await login(CLIENT_B, "b@smaug.test")).status).toBe(200);
  });

  it("should count refreshes per forwarded client IP", async () => {
    expect((await refresh(CLIENT_A)).status).toBe(401);
    expectTooManyRequests(await refresh(CLIENT_A));

    expect((await refresh(CLIENT_B)).status).toBe(401);
  });
});
