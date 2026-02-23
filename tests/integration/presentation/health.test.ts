import request from "supertest";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

describe("GET /health", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, DATABASE_PROVIDER: "memory", DATABASE_URL: "file:./dev.db" };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("returns ok with memory provider", async () => {
    const { createHttpServer } = await import("../../../src/infrastructure/http/server.ts");
    const app = createHttpServer();

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database.provider).toBe("memory");
  });
});
