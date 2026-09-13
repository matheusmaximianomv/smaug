import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";
import type { NextFunction, Response } from "express";
import { requestLoggerMiddleware } from "@src/presentation/middlewares/request-logger.middleware";
import { container } from "@src/infrastructure/config/container.ts";
import { createRequestMock } from "../../../helpers/http-mocks";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock("@src/infrastructure/config/container.ts", () => ({
  container: { resolve: vi.fn() },
}));

describe("requestLoggerMiddleware", () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(logger);
    next = vi.fn();
  });

  it("should log the request once the response finishes", () => {
    const res = new EventEmitter() as unknown as Response;
    (res as unknown as { statusCode: number }).statusCode = 201;

    requestLoggerMiddleware(
      createRequestMock({ method: "POST", originalUrl: "/users" }),
      res,
      next,
    );

    expect(next).toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();

    (res as unknown as EventEmitter).emit("finish");

    expect(logger.info).toHaveBeenCalledWith("HTTP request", {
      method: "POST",
      path: "/users",
      statusCode: 201,
      responseTime: expect.any(Number),
    });
  });
});
