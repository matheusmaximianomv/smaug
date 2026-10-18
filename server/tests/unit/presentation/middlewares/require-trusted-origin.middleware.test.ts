import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { requireTrustedOrigin } from "@src/presentation/middlewares/require-trusted-origin.middleware";
import {
  createRequestMock,
  createResponseMock,
  type ResponseMock,
} from "../../../helpers/http-mocks";

const WEB_ORIGIN = "http://localhost:3001";

describe("requireTrustedOrigin", () => {
  const middleware = requireTrustedOrigin(WEB_ORIGIN);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    res = createResponseMock();
    next = vi.fn();
  });

  it("should continue when the Origin header is absent", () => {
    middleware(createRequestMock({ headers: {} }), res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should continue when the Origin is the web origin", () => {
    middleware(createRequestMock({ headers: { origin: WEB_ORIGIN } }), res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should answer 403 when the Origin is a different one", () => {
    middleware(createRequestMock({ headers: { origin: "https://malicioso.example" } }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: "ORIGIN_NOT_ALLOWED",
      message: "Origin not allowed",
    });
    expect(next).not.toHaveBeenCalled();
  });
});
