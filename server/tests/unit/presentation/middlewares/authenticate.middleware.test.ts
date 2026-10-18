import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction, Request } from "express";
import {
  authenticate,
  authenticateIfPresent,
} from "@src/presentation/middlewares/authenticate.middleware";
import type { AuthenticateRequestUseCase } from "@src/domain/use-cases/auth/authenticate-request.use-case";
import {
  createRequestMock,
  createResponseMock,
  type ResponseMock,
} from "../../../helpers/http-mocks";

const CLAIMS = { userId: "user-1", sessionId: "session-1", tokenId: "jti-1" };
const UNAUTHORIZED = { error: "UNAUTHORIZED", message: "Authentication required" };

const requestWith = (authorization?: unknown): Request =>
  createRequestMock({
    headers: (authorization === undefined ? {} : { authorization }) as never,
    userId: undefined,
    sessionId: undefined,
  });

describe("authenticate", () => {
  const useCase = { execute: vi.fn() };
  const middleware = authenticate(useCase as unknown as AuthenticateRequestUseCase);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["Basic", "Basic dXNlcjpwYXNz"],
    ["a bare Bearer", "Bearer "],
    ["malformed", "Bearer two tokens"],
  ])("should answer 401 without calling the use case when the header is %s", async (_, header) => {
    await middleware(requestWith(header), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHORIZED);
    expect(useCase.execute).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("should answer 401 when the token or its session is not valid", async () => {
    useCase.execute.mockResolvedValue(null);
    const req = requestWith("Bearer expired.or.revoked");

    await middleware(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ accessToken: "expired.or.revoked" });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(UNAUTHORIZED);
    expect(req.userId).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("should fill userId and sessionId and continue for a valid token", async () => {
    useCase.execute.mockResolvedValue(CLAIMS);
    const req = requestWith("bearer header.payload.signature");

    await middleware(req, res, next);

    expect(useCase.execute).toHaveBeenCalledWith({ accessToken: "header.payload.signature" });
    expect(req.userId).toBe("user-1");
    expect(req.sessionId).toBe("session-1");
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe("authenticateIfPresent", () => {
  const useCase = { execute: vi.fn() };
  const middleware = authenticateIfPresent(useCase as unknown as AuthenticateRequestUseCase);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should continue without identity when there is no Bearer", async () => {
    const req = requestWith(undefined);

    await middleware(req, res, next);

    expect(req.sessionId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should continue without identity when the Bearer is invalid", async () => {
    useCase.execute.mockResolvedValue(null);
    const req = requestWith("Bearer expired");

    await middleware(req, res, next);

    expect(req.sessionId).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should fill userId and sessionId for a valid Bearer", async () => {
    useCase.execute.mockResolvedValue(CLAIMS);
    const req = requestWith("Bearer valid");

    await middleware(req, res, next);

    expect(req.userId).toBe("user-1");
    expect(req.sessionId).toBe("session-1");
    expect(next).toHaveBeenCalledWith();
  });
});
