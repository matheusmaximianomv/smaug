import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

// O server/.env local (dotenv) não pode repor o TRUST_PROXY que este arquivo deixa ausente.
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const testDb = sqliteTestDatabase("auth-rate-limit");
const WEB_ORIGIN = "http://localhost:3001";
const PASSWORD = "correct horse battery staple";

// Sem TRUST_PROXY: o X-Forwarded-For é forjável e precisa ser ignorado — toda requisição conta
// para o IP real da conexão, por mais que o cabeçalho varie.
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
  TRUST_PROXY: undefined,
  AUTH_RATE_LIMIT_REGISTER_PER_IP: "2",
  AUTH_RATE_LIMIT_LOGIN_PER_IP: "5",
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: "2",
  AUTH_RATE_LIMIT_REFRESH_PER_IP: "2",
};

const expectTooManyRequests = (res: request.Response): void => {
  expect(res.status).toBe(429);
  expect(res.body).toEqual({ error: "TOO_MANY_REQUESTS", message: expect.any(String) });
  expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
};

describe("Auth rate limit without a trusted proxy", () => {
  let app: Express;
  const previousEnv: Record<string, string | undefined> = {};
  let forwarded = 0;
  /** Um IP diferente a cada chamada: se o cabeçalho fosse aceito, nenhum limite seria atingido. */
  const spoofedIp = (): string => `198.51.100.${++forwarded}`;

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

  const register = (email: string) =>
    request(app)
      .post("/auth/register")
      .set("X-Forwarded-For", spoofedIp())
      .send({ name: "Smaug", email, password: PASSWORD });
  const login = (email: string, password = "wrong horse battery staple") =>
    request(app).post("/auth/login").set("X-Forwarded-For", spoofedIp()).send({ email, password });
  const refresh = () => request(app).post("/auth/refresh").set("X-Forwarded-For", spoofedIp());

  it("should limit registrations per connection IP ignoring X-Forwarded-For", async () => {
    expect((await register("first@smaug.test")).status).toBe(201);
    expect((await register("second@smaug.test")).status).toBe(201);

    expectTooManyRequests(await register("third@smaug.test"));
  });

  it("should limit logins per IP and email, then per IP, ignoring X-Forwarded-For", async () => {
    expect((await login("first@smaug.test")).status).toBe(401);
    expect((await login("first@smaug.test")).status).toBe(401);
    expectTooManyRequests(await login("FIRST@smaug.test"));
    // Força bruta: depois do bloqueio nem a senha certa entra — senão o 429 vira oráculo.
    expectTooManyRequests(await login("first@smaug.test", PASSWORD));

    expect((await login("other@smaug.test")).status).toBe(401);
    expectTooManyRequests(await login("another@smaug.test"));
  });

  it("should limit refreshes per connection IP ignoring X-Forwarded-For", async () => {
    expect((await refresh()).status).toBe(401);
    expect((await refresh()).status).toBe(401);

    expectTooManyRequests(await refresh());
  });
});
