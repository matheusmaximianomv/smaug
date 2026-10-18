import request from "supertest";
import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import type { Express } from "express";
import { sqliteTestDatabase } from "../../helpers/sqlite-test-database";

const testDb = sqliteTestDatabase("user");

describe("User Endpoints", () => {
  let prisma: PrismaClient;
  let app: Express;

  beforeAll(async () => {
    vi.resetModules();

    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = testDb.url;
    process.env.NODE_ENV = "test";
    process.env.PORT = "3000";
    process.env.LOG_LEVEL = "error";

    testDb.push();
    prisma = testDb.client();

    // Dynamic import so PrismaClient in container picks up the test DATABASE_URL
    const { createHttpServer } = await import("@src/infrastructure/http/server");
    app = createHttpServer();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  describe("POST /users", () => {
    it("should create a user successfully", async () => {
      const res = await request(app).post("/users").send({
        name: "João Silva",
        email: "joao@example.com",
      });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("João Silva");
      expect(res.body.email).toBe("joao@example.com");
      expect(res.body.createdAt).toBeDefined();
    });

    it("should return 400 for missing name", async () => {
      const res = await request(app).post("/users").send({
        email: "test@test.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 400 for invalid email", async () => {
      const res = await request(app).post("/users").send({
        name: "Test",
        email: "not-an-email",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("should return 409 for duplicate email", async () => {
      await request(app).post("/users").send({
        name: "First",
        email: "duplicate@example.com",
      });

      const res = await request(app).post("/users").send({
        name: "Second",
        email: "duplicate@example.com",
      });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("EMAIL_ALREADY_EXISTS");
    });

    it("should return 400 for empty name", async () => {
      const res = await request(app).post("/users").send({
        name: "",
        email: "empty@test.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /users/:id", () => {
    it("should return a user by id", async () => {
      const createRes = await request(app).post("/users").send({
        name: "Maria",
        email: "maria@example.com",
      });

      const res = await request(app).get(`/users/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Maria");
      expect(res.body.email).toBe("maria@example.com");
    });

    it("should return 404 for non-existent user", async () => {
      const res = await request(app).get("/users/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("USER_NOT_FOUND");
    });
  });
});
