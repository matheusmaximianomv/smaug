import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import type { Express } from "express";
import type { PrismaClient } from "@prisma/client";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const lines = vi.hoisted((): string[] => []);

// O pino real, com as opções reais do logger (redact incluído), escrevendo num coletor em vez do
// stdout: o que se verifica é a linha serializada que iria para o log.
vi.mock("pino", async (importOriginal) => {
  const actual = await importOriginal<typeof import("pino")>();
  return {
    ...actual,
    default: (options: Parameters<typeof actual.pino>[0]) =>
      actual.pino(options, { write: (line: string) => lines.push(line) }),
  };
});

const testDb = sqliteTestDatabase("auth-logs");
const WEB_ORIGIN = "http://localhost:3001";
const PASSWORD = "correct horse battery staple";
const WRONG_PASSWORD = "wrong horse battery staple";
const EMAIL = "logs@smaug.test";

const refreshCookieOf = (res: request.Response): string => {
  const header = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cookie = header.find((value) => value.startsWith("smaug_refresh="));
  if (!cookie) throw new Error("smaug_refresh cookie not set");
  return cookie;
};
const cookieValue = (setCookie: string): string => setCookie.split(";")[0]!.split("=")[1]!;

describe("auth logs", () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    vi.resetModules();

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = testDb.url;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "info";
    process.env.CORS_ORIGIN = WEB_ORIGIN;
    process.env.ARGON2_MEMORY_KIB = "1024";
    process.env.ARGON2_TIME_COST = "1";
    process.env.ARGON2_PARALLELISM = "1";

    testDb.push();
    prisma = testDb.client();

    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  it("should log the auth events without the password, tokens or Set-Cookie", async () => {
    const register = await request(app)
      .post("/auth/register")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "Smaug", email: EMAIL, password: PASSWORD });
    expect(register.status).toBe(201);

    const me = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body).toEqual(register.body.user);

    const failed = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL, password: WRONG_PASSWORD });
    expect(failed.status).toBe(401);

    const login = await request(app).post("/auth/login").send({ email: EMAIL, password: PASSWORD });
    expect(login.status).toBe(200);
    const loginCookie = refreshCookieOf(login);

    const refresh = await request(app)
      .post("/auth/refresh")
      .set("Cookie", loginCookie.split(";")[0]!);
    expect(refresh.status).toBe(200);
    const refreshCookie = refreshCookieOf(refresh);

    const logout = await request(app)
      .post("/auth/logout")
      .set("Cookie", refreshCookie.split(";")[0]!);
    expect(logout.status).toBe(204);

    const logoutAll = await request(app)
      .post("/auth/logout-all")
      .set("Authorization", `Bearer ${register.body.accessToken}`);
    expect(logoutAll.status).toBe(204);

    const secrets = [
      PASSWORD,
      WRONG_PASSWORD,
      EMAIL,
      register.body.accessToken,
      login.body.accessToken,
      refresh.body.accessToken,
      refreshCookieOf(register),
      cookieValue(refreshCookieOf(register)),
      loginCookie,
      cookieValue(loginCookie),
      refreshCookie,
      cookieValue(refreshCookie),
    ];
    const log = lines.join("");
    for (const secret of secrets) {
      expect(log).not.toContain(secret);
    }

    const messages = lines.map((line) => JSON.parse(line).msg);
    expect(messages).toEqual(
      expect.arrayContaining([
        "auth.register",
        "auth.login.failed",
        "auth.login.succeeded",
        "auth.session.revoked",
      ]),
    );
  });

  it("should answer 500 and log an error when the stored pepper id is not in the keyring", async () => {
    const email = "unknown-pepper@smaug.test";
    const register = await request(app)
      .post("/auth/register")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "Smaug", email, password: PASSWORD });
    expect(register.status).toBe(201);
    await prisma.passwordCredential.update({
      where: { userId: register.body.user.id },
      data: { pepperId: "retired" },
    });
    lines.length = 0;

    const login = await request(app).post("/auth/login").send({ email, password: PASSWORD });

    expect(login.status).toBe(500);
    expect(login.body).toEqual({ error: "Internal Server Error" });
    expect(([] as string[]).concat(login.headers["set-cookie"] ?? [])).toEqual([]);
    const errors = lines.map((line) => JSON.parse(line)).filter((entry) => entry.level === 50);
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Password pepper "retired" is not in the keyring');
    expect(lines.join("")).not.toContain(PASSWORD);
  });
});
