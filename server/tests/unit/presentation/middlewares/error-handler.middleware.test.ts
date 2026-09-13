import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { errorHandlerMiddleware } from "@src/presentation/middlewares/error-handler.middleware";
import { container } from "@src/infrastructure/config/container.ts";
import { createRequestMock, createResponseMock, type ResponseMock } from "../../../helpers/http-mocks";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

vi.mock("@src/infrastructure/config/container.ts", () => ({
  container: { resolve: vi.fn() },
}));

describe("errorHandlerMiddleware", () => {
  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(container.resolve).mockReturnValue(logger);
    res = createResponseMock();
    next = vi.fn();
  });

  it("should log the error and answer 500", () => {
    const error = new Error("boom");
    const req = createRequestMock({ method: "POST", originalUrl: "/expenses/one-time" });

    errorHandlerMiddleware(error, req, res, next);

    expect(logger.error).toHaveBeenCalledWith("Unhandled error", {
      method: "POST",
      path: "/expenses/one-time",
      message: "boom",
      stack: error.stack,
    });
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal Server Error" });
    expect(next).not.toHaveBeenCalled();
  });

  it("should delegate to next when the response has already been sent", () => {
    const error = new Error("boom");
    (res as unknown as { headersSent: boolean }).headersSent = true;

    errorHandlerMiddleware(error, createRequestMock(), res, next);

    expect(logger.error).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});
