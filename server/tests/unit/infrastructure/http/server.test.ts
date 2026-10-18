import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

// O server/.env local (dotenv) não pode repor o TRUST_PROXY que este arquivo deixa ausente.
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

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

  it("should require a Bearer token on protected route groups, ignoring X-User-Id", async () => {
    const { createHttpServer } = await import("@src/infrastructure/http/server.ts");
    const app = createHttpServer();

    const res = await request(app)
      .get("/expenses/categories")
      .set("X-User-Id", "3f2504e0-4f89-41d3-9a0c-0305e82c3301");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "UNAUTHORIZED", message: "Authentication required" });
  });

  it("should not trust any proxy when TRUST_PROXY is not set", async () => {
    const { createHttpServer } = await import("@src/infrastructure/http/server.ts");
    const app = createHttpServer();

    expect(app.get("trust proxy")).toBe(false);
  });

  it("should trust the configured proxy hops", async () => {
    process.env.TRUST_PROXY = "1";
    const { createHttpServer } = await import("@src/infrastructure/http/server.ts");
    const app = createHttpServer();

    expect(app.get("trust proxy")).toBe(1);
  });
});
