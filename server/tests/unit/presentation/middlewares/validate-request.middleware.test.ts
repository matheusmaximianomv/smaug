import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction, Request } from "express";
import { z } from "zod";
import {
  validateRequest,
  validateQuery,
} from "@src/presentation/middlewares/validate-request.middleware";
import { createRequestMock, createResponseMock, type ResponseMock } from "../../../helpers/http-mocks";

const bodySchema = z.object({
  name: z.string().min(3, "Name must have at least 3 characters").max(5, "Name is too long"),
});

/** Schema com refine no objeto raiz: produz um issue de `path` vazio. */
const rootSchema = z
  .object({ description: z.string().optional(), amount: z.number().optional() })
  .refine((data) => data.description !== undefined || data.amount !== undefined, {
    message: "At least one field must be provided",
  });

const querySchema = z.object({ competenceYear: z.coerce.number().int() });

describe("validateRequest", () => {
  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should replace the body with the parsed data and continue", () => {
    const req = createRequestMock({ body: { name: "Ana" } });

    validateRequest(bodySchema)(req, res, next);

    expect(req.body).toEqual({ name: "Ana" });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should group multiple issues under the same field", () => {
    validateRequest(bodySchema)(createRequestMock({ body: { name: 10 } }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "VALIDATION_ERROR",
      message: "Invalid request body",
      details: expect.objectContaining({ name: expect.any(Array) }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should accumulate several messages for the same field", () => {
    validateRequest(
      z.object({ name: z.string().min(3, "too short").regex(/^\d+$/, "must be numeric") }),
    )(createRequestMock({ body: { name: "ab" } }), res, next);

    const details = res.json.mock.calls[0][0].details as Record<string, string[]>;
    expect(details.name).toEqual(["too short", "must be numeric"]);
  });

  it("should report root-level issues under the _root key", () => {
    validateRequest(rootSchema)(createRequestMock({ body: {} }), res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: "VALIDATION_ERROR",
      message: "Invalid request body",
      details: { _root: ["At least one field must be provided"] },
    });
  });
});

describe("validateQuery", () => {
  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should expose the parsed query as validatedQuery and continue", () => {
    const req = createRequestMock({ query: { competenceYear: "2026" } });

    validateQuery(querySchema)(req, res, next);

    expect((req as Request & { validatedQuery: unknown }).validatedQuery).toEqual({
      competenceYear: 2026,
    });
    expect(next).toHaveBeenCalled();
  });

  it("should answer 400 for an invalid query", () => {
    validateQuery(querySchema)(createRequestMock({ query: {} }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "VALIDATION_ERROR",
      message: "Invalid query parameters",
      details: expect.objectContaining({ competenceYear: expect.any(Array) }),
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should report root-level query issues under the _root key", () => {
    validateQuery(rootSchema)(createRequestMock({ query: {} }), res, next);

    expect(res.json).toHaveBeenCalledWith({
      error: "VALIDATION_ERROR",
      message: "Invalid query parameters",
      details: { _root: ["At least one field must be provided"] },
    });
  });

  it("should accumulate several messages for the same query field", () => {
    validateQuery(z.object({ page: z.string().min(2, "too short").regex(/^\d+$/, "must be numeric") }))(
      createRequestMock({ query: { page: "a" } }),
      res,
      next,
    );

    const details = res.json.mock.calls[0][0].details as Record<string, string[]>;
    expect(details.page).toEqual(["too short", "must be numeric"]);
  });
});
