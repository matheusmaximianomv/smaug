import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction, Request } from "express";
import { extractUser } from "@src/presentation/middlewares/extract-user.middleware";
import type { UserRepository } from "@src/domain/ports/user.repository";
import { createRequestMock, createResponseMock, type ResponseMock } from "../../../helpers/http-mocks";

const VALID_UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("extractUser", () => {
  const userRepository = { findById: vi.fn(), findByEmail: vi.fn(), create: vi.fn() };
  const middleware = extractUser(userRepository as unknown as UserRepository);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  const requestWithHeader = (value: unknown): Request =>
    createRequestMock({ headers: { "x-user-id": value } as never, userId: undefined });

  it("should answer 401 when the header is missing", async () => {
    await middleware(createRequestMock({ headers: {}, userId: undefined }), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "UNAUTHORIZED",
      message: "Header X-User-Id is required",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should answer 401 when the header is repeated (array)", async () => {
    await middleware(requestWithHeader([VALID_UUID, VALID_UUID]), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "UNAUTHORIZED",
      message: "Header X-User-Id is required",
    });
  });

  it("should answer 401 when the header is not a UUID", async () => {
    await middleware(requestWithHeader("not-a-uuid"), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: "UNAUTHORIZED",
      message: "Header X-User-Id must be a valid UUID",
    });
    expect(userRepository.findById).not.toHaveBeenCalled();
  });

  it("should answer 404 when the user does not exist", async () => {
    userRepository.findById.mockResolvedValue(null);

    await middleware(requestWithHeader(VALID_UUID), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "USER_NOT_FOUND",
      message: "User not found",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should attach the userId and continue when the user exists", async () => {
    userRepository.findById.mockResolvedValue({ id: VALID_UUID });
    const req = requestWithHeader(VALID_UUID);

    await middleware(req, res, next);

    expect(req.userId).toBe(VALID_UUID);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
