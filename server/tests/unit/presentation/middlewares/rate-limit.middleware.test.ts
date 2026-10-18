import { describe, it, expect, beforeEach, vi } from "vitest";
import express, { type Express, type RequestHandler } from "express";
import request from "supertest";
import {
  createAuthRateLimiters,
  ipAndEmailKey,
  type AuthRateLimits,
} from "@src/presentation/middlewares/rate-limit.middleware";
import type { Logger } from "@src/application/ports/logger.interface";
import { createRequestMock } from "../../../helpers/http-mocks";

const WINDOW_MS = 60_000;
const ONE_PER_WINDOW = { limit: 1, windowMs: WINDOW_MS };
const LIMITS: AuthRateLimits = {
  register: ONE_PER_WINDOW,
  loginPerIp: { limit: 3, windowMs: WINDOW_MS },
  loginPerEmail: ONE_PER_WINDOW,
  refresh: ONE_PER_WINDOW,
};

function appWith(...limiters: RequestHandler[]): Express {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.post("/", ...limiters, (_req, res) => {
    res.status(204).send();
  });
  return app;
}

describe("createAuthRateLimiters", () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
  let limiters: ReturnType<typeof createAuthRateLimiters>;

  beforeEach(() => {
    vi.clearAllMocks();
    limiters = createAuthRateLimiters(logger as Logger, LIMITS);
  });

  it("should answer 429 in the project error format with Retry-After and log the event", async () => {
    const app = appWith(limiters.refresh);

    await request(app).post("/").expect(204);
    const res = await request(app).post("/");

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests, try again later",
    });
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(logger.warn).toHaveBeenCalledWith("auth.rate_limited", {
      limiter: "refresh",
      path: "/",
    });
  });

  it("should count each client IP separately", async () => {
    const app = appWith(limiters.register);

    await request(app).post("/").set("X-Forwarded-For", "203.0.113.1").expect(204);
    await request(app).post("/").set("X-Forwarded-For", "203.0.113.2").expect(204);
    await request(app).post("/").set("X-Forwarded-For", "203.0.113.1").expect(429);
  });

  it("should count login attempts per IP and normalized email", async () => {
    const app = appWith(limiters.loginPerIp, limiters.loginPerEmail);

    await request(app).post("/").send({ email: "ana@exemplo.com" }).expect(204);
    await request(app).post("/").send({ email: "  ANA@exemplo.com " }).expect(429);
    await request(app).post("/").send({ email: "bia@exemplo.com" }).expect(204);
    await request(app).post("/").send({}).expect(429);
  });

  it("should key a login without an email apart from the ones with an email", async () => {
    const app = appWith(limiters.loginPerEmail);

    await request(app).post("/").send({ email: 42 }).expect(204);
    await request(app).post("/").send({ email: "ana@exemplo.com" }).expect(204);
    await request(app).post("/").send({}).expect(429);
  });
});

describe("ipAndEmailKey", () => {
  it("should join the client IP and the normalized email", () => {
    const req = createRequestMock({ ip: "203.0.113.1", body: { email: " Ana@Exemplo.com " } });

    expect(ipAndEmailKey(req)).toBe("203.0.113.1|ana@exemplo.com");
  });

  it("should still build a key when the connection has no IP", () => {
    const req = createRequestMock({ ip: undefined, body: {} });

    expect(ipAndEmailKey(req)).toBe("|");
  });
});
