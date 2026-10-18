import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { decodeJwt, SignJWT } from "jose";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("user");
const WEB_ORIGIN = "http://localhost:3001";

const base64url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

describe("User Endpoints", () => {
  let app: Express;
  let accessToken: string;
  let user: { id: string; name: string; email: string; createdAt: string };

  const authHeaders = () => ({ Authorization: `Bearer ${accessToken}` });

  beforeAll(async () => {
    vi.resetModules();

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = testDb.url;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "error";
    process.env.CORS_ORIGIN = WEB_ORIGIN;
    process.env.ARGON2_MEMORY_KIB = "1024";
    process.env.ARGON2_TIME_COST = "1";
    process.env.ARGON2_PARALLELISM = "1";

    testDb.push();

    // Dynamic import so PrismaClient in container picks up the test DATABASE_URL
    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();

    const registered = await request(app)
      .post("/auth/register")
      .send({ name: "João Silva", email: "joao@example.com", password: "correct horse battery" });
    accessToken = registered.body.accessToken;
    user = registered.body.user;
  });

  afterAll(() => {
    testDb.remove();
  });

  describe("GET /users/me", () => {
    it("should return the authenticated user", async () => {
      const res = await request(app).get("/users/me").set(authHeaders());

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: user.id,
        name: "João Silva",
        email: "joao@example.com",
        createdAt: user.createdAt,
      });
    });

    it("should return 401 without an Authorization header", async () => {
      const res = await request(app).get("/users/me");

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("should return 401 for a non-Bearer scheme", async () => {
      const res = await request(app).get("/users/me").set("Authorization", `Basic ${accessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("should return 401 for the legacy X-User-Id header", async () => {
      const res = await request(app).get("/users/me").set("X-User-Id", user.id);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });
  });

  describe("access token", () => {
    it("should answer with the Bearer owner even when another user's id comes in X-User-Id", async () => {
      const other = await request(app)
        .post("/auth/register")
        .send({ name: "Maria", email: "maria@example.com", password: "correct horse battery" });
      expect(other.status).toBe(201);

      const res = await request(app)
        .get("/users/me")
        .set(authHeaders())
        .set("X-User-Id", other.body.user.id);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user.id);
      expect(res.body.email).toBe("joao@example.com");
    });

    it("should return 401 for an unsigned token with alg none", async () => {
      const claims = decodeJwt(accessToken);
      const unsigned = `${base64url({ alg: "none", typ: "at+jwt", kid: "test" })}.${base64url(claims)}.`;

      const res = await request(app).get("/users/me").set("Authorization", `Bearer ${unsigned}`);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });

    it("should return 401 for an expired token signed with the right key", async () => {
      const { sub, sid } = decodeJwt(accessToken);
      const sign = (issuedAt: number, expiresAt: number) =>
        new SignJWT({ sid })
          .setProtectedHeader({ alg: "HS256", typ: "at+jwt", kid: process.env.JWT_KEY_ID })
          .setIssuer("smaug-api")
          .setAudience("smaug-web")
          .setSubject(sub!)
          .setJti(randomUUID())
          .setIssuedAt(issuedAt)
          .setExpirationTime(expiresAt)
          .sign(Buffer.from(process.env.JWT_SECRET!, "base64"));
      const now = Math.floor(Date.now() / 1000);
      const valid = await sign(now, now + 600);
      const expired = await sign(now - 660, now - 60);

      const control = await request(app).get("/users/me").set("Authorization", `Bearer ${valid}`);
      const res = await request(app).get("/users/me").set("Authorization", `Bearer ${expired}`);

      expect(control.status).toBe(200);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHORIZED");
    });
  });

  describe("removed routes", () => {
    it("should no longer create users on POST /users", async () => {
      const res = await request(app)
        .post("/users")
        .set(authHeaders())
        .send({ name: "Maria", email: "maria.removed@example.com" });

      expect(res.status).toBe(404);
    });

    it("should no longer expose GET /users/:id", async () => {
      const res = await request(app).get(`/users/${user.id}`).set(authHeaders());

      expect(res.status).toBe(404);
    });
  });
});
