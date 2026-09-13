import { vi } from "vitest";
import type { Request, Response } from "express";

export type ResponseMock = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
};

export function createResponseMock(): ResponseMock {
  const res: Record<string, unknown> = { headersSent: false };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  res.send = vi.fn(() => res);
  return res as unknown as ResponseMock;
}

export function createRequestMock(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    method: "GET",
    originalUrl: "/",
    userId: "user-1",
    ...overrides,
  } as unknown as Request;
}
