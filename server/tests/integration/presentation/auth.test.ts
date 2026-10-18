import { createHash } from "node:crypto";
import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("auth");
const WEB_ORIGIN = "http://localhost:3001";
const PASSWORD = "correct horse battery staple";

// Limites altos: este arquivo faz dezenas de cadastros/logins/refreshes do mesmo IP e não testa
// rate limit (isso fica nos auth-rate-limit*.test.ts).
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
  REFRESH_REUSE_GRACE_SECONDS: "30",
  TRUST_PROXY: undefined,
  AUTH_RATE_LIMIT_REGISTER_PER_IP: "1000",
  AUTH_RATE_LIMIT_LOGIN_PER_IP: "1000",
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: "1000",
  AUTH_RATE_LIMIT_REFRESH_PER_IP: "1000",
};

const setCookiesOf = (res: request.Response): string[] =>
  ([] as string[]).concat(res.headers["set-cookie"] ?? []);
const refreshCookieOf = (res: request.Response): string | undefined =>
  setCookiesOf(res).find((value) => value.startsWith("smaug_refresh="));
/** O par `nome=valor`, que é o que o navegador reenvia. */
const cookiePair = (res: request.Response): string => {
  const cookie = refreshCookieOf(res);
  if (!cookie) throw new Error("smaug_refresh cookie not set");
  return cookie.split(";")[0]!;
};
const tokenOf = (res: request.Response): string => cookiePair(res).split("=")[1]!;
const isCleared = (cookie: string | undefined): boolean =>
  cookie !== undefined &&
  cookie.startsWith("smaug_refresh=;") &&
  cookie.includes("Expires=Thu, 01 Jan 1970");
const bearer = (token: string): string => `Bearer ${token}`;

let sequence = 0;
const uniqueEmail = (label: string): string => `${label}-${++sequence}@smaug.test`;

describe("Auth Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;
  const previousEnv: Record<string, string | undefined> = {};

  const register = (email: string, password = PASSWORD) =>
    request(app)
      .post("/auth/register")
      .set("Origin", WEB_ORIGIN)
      .send({ name: "Smaug", email, password });
  const login = (email: string, password = PASSWORD) =>
    request(app).post("/auth/login").set("Origin", WEB_ORIGIN).send({ email, password });
  const refresh = (pair?: string) => {
    const req = request(app).post("/auth/refresh").set("Origin", WEB_ORIGIN);
    return pair ? req.set("Cookie", pair) : req;
  };
  const me = (accessToken: string) =>
    request(app).get("/users/me").set("Authorization", bearer(accessToken));

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

  describe("full walk-through", () => {
    it("should register, access, refresh, conflict, logout and lose access", async () => {
      const email = uniqueEmail("walk");
      const registered = await register(email);
      expect(registered.status).toBe(201);
      expect(registered.body).toEqual({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 600,
        user: { id: expect.any(String), name: "Smaug", email, createdAt: expect.any(String) },
      });
      expect(registered.body).not.toHaveProperty("refreshToken");
      const t1 = cookiePair(registered);

      const profile = await me(registered.body.accessToken);
      expect(profile.status).toBe(200);
      expect(profile.body).toEqual(registered.body.user);

      const renewed = await refresh(t1);
      expect(renewed.status).toBe(200);
      expect(renewed.body).toEqual({
        accessToken: expect.any(String),
        tokenType: "Bearer",
        expiresIn: 600,
        user: registered.body.user,
      });
      const t2 = cookiePair(renewed);
      expect(t2).not.toBe(t1);

      const stale = await refresh(t1);
      expect(stale.status).toBe(409);
      expect(stale.body.error).toBe("REFRESH_TOKEN_CONFLICT");

      const logout = await request(app)
        .post("/auth/logout")
        .set("Origin", WEB_ORIGIN)
        .set("Cookie", t2);
      expect(logout.status).toBe(204);
      expect(isCleared(refreshCookieOf(logout))).toBe(true);

      const afterLogout = await refresh(t2);
      expect(afterLogout.status).toBe(401);
      expect(afterLogout.body.error).toBe("INVALID_REFRESH_TOKEN");

      expect((await me(renewed.body.accessToken)).status).toBe(401);
      expect((await me(registered.body.accessToken)).status).toBe(401);
    });
  });

  describe("refresh cookie", () => {
    it("should be HttpOnly, SameSite=Strict, Path=/api/auth with Max-Age and no Secure in test", async () => {
      const res = await register(uniqueEmail("cookie"));

      const cookie = refreshCookieOf(res)!;
      const attributes = cookie.split(";").map((part) => part.trim());
      expect(attributes).toEqual(
        expect.arrayContaining(["HttpOnly", "SameSite=Strict", "Path=/api/auth"]),
      );
      const maxAge = attributes.find((part) => part.startsWith("Max-Age="));
      expect(Number(maxAge?.split("=")[1])).toBeGreaterThan(604800 - 60);
      expect(Number(maxAge?.split("=")[1])).toBeLessThanOrEqual(604800);
      expect(attributes).not.toContain("Secure");
      expect(cookie).not.toMatch(/Domain=/i);
    });
  });

  describe("error codes", () => {
    it("should return 400 VALIDATION_ERROR for an invalid register body", async () => {
      const res = await register("not-an-email", "short");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
      expect(refreshCookieOf(res)).toBeUndefined();
    });

    it("should return 400 VALIDATION_ERROR for an invalid login body", async () => {
      const res = await request(app).post("/auth/login").send({ email: "nobody@smaug.test" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 409 EMAIL_ALREADY_EXISTS for the same email in another case", async () => {
      const email = uniqueEmail("dup");
      expect((await register(email)).status).toBe(201);

      const res = await register(`  ${email.toUpperCase()} `);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("EMAIL_ALREADY_EXISTS");
      expect(refreshCookieOf(res)).toBeUndefined();
    });

    it("should return 401 INVALID_CREDENTIALS with the same body for unknown email and wrong password", async () => {
      const email = uniqueEmail("creds");
      expect((await register(email)).status).toBe(201);

      const wrongPassword = await login(email, "wrong horse battery staple");
      const unknownEmail = await login(uniqueEmail("ghost"));

      expect(wrongPassword.status).toBe(401);
      expect(wrongPassword.body.error).toBe("INVALID_CREDENTIALS");
      expect(unknownEmail.status).toBe(401);
      expect(unknownEmail.body).toEqual(wrongPassword.body);
      expect(refreshCookieOf(wrongPassword)).toBeUndefined();
      expect(refreshCookieOf(unknownEmail)).toBeUndefined();
    });

    it("should log in with the email in another case", async () => {
      const email = uniqueEmail("case");
      expect((await register(email)).status).toBe(201);

      const res = await login(email.toUpperCase());

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(email);
      expect(refreshCookieOf(res)).toBeDefined();
    });

    it("should keep dots and the plus suffix as different accounts", async () => {
      const dotted = await register("ana.silva@gmail.com");
      const tagged = await register("anasilva+smaug@gmail.com");

      expect(dotted.status).toBe(201);
      expect(tagged.status).toBe(201);
      expect(dotted.body.user.email).toBe("ana.silva@gmail.com");
      expect(tagged.body.user.email).toBe("anasilva+smaug@gmail.com");
      expect(dotted.body.user.id).not.toBe(tagged.body.user.id);
    });

    it("should treat surrounding spaces as part of the password", async () => {
      const email = uniqueEmail("spaces");
      expect((await register(email, `  ${PASSWORD}  `)).status).toBe(201);

      const trimmed = await login(email, PASSWORD);
      const exact = await login(email, `  ${PASSWORD}  `);

      expect(trimmed.status).toBe(401);
      expect(trimmed.body.error).toBe("INVALID_CREDENTIALS");
      expect(exact.status).toBe(200);
    });

    it("should return 401 INVALID_REFRESH_TOKEN and clear the cookie without a cookie", async () => {
      const res = await refresh();

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_REFRESH_TOKEN");
      expect(isCleared(refreshCookieOf(res))).toBe(true);
    });

    it("should return 401 INVALID_REFRESH_TOKEN and clear the cookie for an unknown token", async () => {
      const res = await refresh("smaug_refresh=unknown-token");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_REFRESH_TOKEN");
      expect(isCleared(refreshCookieOf(res))).toBe(true);
    });

    it("should return 409 REFRESH_TOKEN_CONFLICT without touching the cookie inside the grace window", async () => {
      const registered = await register(uniqueEmail("conflict"));
      const t1 = cookiePair(registered);
      const renewed = await refresh(t1);
      expect(renewed.status).toBe(200);

      const res = await refresh(t1);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("REFRESH_TOKEN_CONFLICT");
      expect(refreshCookieOf(res)).toBeUndefined();
      expect((await refresh(cookiePair(renewed))).status).toBe(200);
    });

    it("should return 401 UNAUTHORIZED on /users/me without a valid Bearer", async () => {
      const missing = await request(app).get("/users/me");
      const garbage = await me("not-a-jwt");

      expect(missing.status).toBe(401);
      expect(missing.body.error).toBe("UNAUTHORIZED");
      expect(garbage.status).toBe(401);
      expect(garbage.body.error).toBe("UNAUTHORIZED");
    });

    it("should return 401 UNAUTHORIZED on logout-all without a Bearer", async () => {
      const res = await request(app).post("/auth/logout-all").set("Origin", WEB_ORIGIN);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("should return 403 ORIGIN_NOT_ALLOWED for a foreign Origin without rotating the token", async () => {
      const registered = await register(uniqueEmail("origin"));
      const t1 = cookiePair(registered);

      const res = await request(app)
        .post("/auth/refresh")
        .set("Origin", "https://malicioso.example")
        .set("Cookie", t1);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("ORIGIN_NOT_ALLOWED");
      expect(refreshCookieOf(res)).toBeUndefined();
      expect((await refresh(t1)).status).toBe(200);
    });

    it("should process an auth request without an Origin header", async () => {
      const email = uniqueEmail("no-origin");
      expect((await register(email)).status).toBe(201);

      const res = await request(app).post("/auth/login").send({ email, password: PASSWORD });

      expect(res.status).toBe(200);
    });
  });

  describe("concurrency", () => {
    it("should answer two simultaneous registrations of the same email with one 201 and one 409", async () => {
      const email = uniqueEmail("race");

      const responses = await Promise.all([register(email), register(email.toUpperCase())]);

      expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
      expect(responses.find((res) => res.status === 409)!.body.error).toBe("EMAIL_ALREADY_EXISTS");
      expect(await prisma.user.count({ where: { email } })).toBe(1);
    });

    it("should answer 10 simultaneous refreshes with one 200 and nine 409 without revoking the session", async () => {
      const registered = await register(uniqueEmail("tabs"));
      const t1 = cookiePair(registered);

      const responses = await Promise.all(Array.from({ length: 10 }, () => refresh(t1)));

      const statuses = responses.map((res) => res.status);
      expect(statuses.filter((status) => status === 200)).toHaveLength(1);
      expect(statuses.filter((status) => status === 409)).toHaveLength(9);
      for (const res of responses.filter((r) => r.status === 409)) {
        expect(res.body.error).toBe("REFRESH_TOKEN_CONFLICT");
      }

      const sessions = await prisma.authSession.findMany({
        where: { userId: registered.body.user.id },
        include: { refreshTokens: true },
      });
      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.status).toBe("ACTIVE");
      expect(sessions[0]!.refreshTokens.filter((t) => t.status === "ACTIVE")).toHaveLength(1);

      const winner = responses.find((res) => res.status === 200)!;
      expect((await refresh(cookiePair(winner))).status).toBe(200);
    });
  });

  describe("database", () => {
    it("should store only the Argon2id hash of the password and the sha256 of the refresh token", async () => {
      const registered = await register(uniqueEmail("hashes"));
      const userId: string = registered.body.user.id;
      const plain = tokenOf(registered);

      const credential = await prisma.passwordCredential.findUniqueOrThrow({ where: { userId } });
      expect(credential.passwordHash.startsWith("$argon2id$")).toBe(true);
      expect(credential.passwordHash).not.toContain(PASSWORD);

      const sessions = await prisma.authSession.findMany({
        where: { userId },
        include: { refreshTokens: true },
      });
      const tokens = sessions.flatMap((session) => session.refreshTokens);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.tokenHash).toBe(createHash("sha256").update(plain).digest("hex"));
      expect(tokens[0]!.tokenHash).not.toBe(plain);
      expect(JSON.stringify(sessions)).not.toContain(plain);
      expect(JSON.stringify(credential)).not.toContain(registered.body.accessToken);
    });
  });

  describe("logout", () => {
    it("should end the session of the Bearer when no cookie is sent", async () => {
      const registered = await register(uniqueEmail("logout-bearer"));

      const res = await request(app)
        .post("/auth/logout")
        .set("Origin", WEB_ORIGIN)
        .set("Authorization", bearer(registered.body.accessToken));

      expect(res.status).toBe(204);
      expect(isCleared(refreshCookieOf(res))).toBe(true);
      expect((await me(registered.body.accessToken)).status).toBe(401);
      expect((await refresh(cookiePair(registered))).status).toBe(401);
    });

    it("should return 204 for a repeated logout without cookie or Bearer", async () => {
      const res = await request(app).post("/auth/logout").set("Origin", WEB_ORIGIN);

      expect(res.status).toBe(204);
      expect(isCleared(refreshCookieOf(res))).toBe(true);
    });

    it("should end every session of the user on logout-all", async () => {
      const email = uniqueEmail("logout-all");
      const deviceA = await register(email);
      const deviceB = await login(email);
      expect(deviceB.status).toBe(200);

      const res = await request(app)
        .post("/auth/logout-all")
        .set("Origin", WEB_ORIGIN)
        .set("Authorization", bearer(deviceA.body.accessToken));

      expect(res.status).toBe(204);
      expect(isCleared(refreshCookieOf(res))).toBe(true);
      expect((await me(deviceA.body.accessToken)).status).toBe(401);
      expect((await me(deviceB.body.accessToken)).status).toBe(401);
      expect((await refresh(cookiePair(deviceA))).status).toBe(401);
      expect((await refresh(cookiePair(deviceB))).status).toBe(401);
    });

    it("should keep the other users' sessions on logout-all", async () => {
      const mine = await register(uniqueEmail("mine"));
      const theirs = await register(uniqueEmail("theirs"));

      await request(app)
        .post("/auth/logout-all")
        .set("Origin", WEB_ORIGIN)
        .set("Authorization", bearer(mine.body.accessToken));

      expect((await me(theirs.body.accessToken)).status).toBe(200);
    });
  });
});
