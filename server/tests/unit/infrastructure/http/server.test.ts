import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

const originalEnv = { ...process.env };

describe("createHttpServer", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_PROVIDER: "memory",
      DATABASE_URL: "file:./dev.db",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      CORS_ORIGIN: "http://localhost:3001",
    };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("should mount the routes, CORS and the JSON body parser", async () => {
    const { createHttpServer } = await import("@src/infrastructure/http/server.ts");
    const app = createHttpServer();

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3001");
  });

  it("should require the X-User-Id header on protected route groups", async () => {
    const { createHttpServer } = await import("@src/infrastructure/http/server.ts");
    const app = createHttpServer();

    const res = await request(app).get("/expenses/categories");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });
});
