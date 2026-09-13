import { describe, it, expect, beforeEach, vi } from "vitest";
import { healthController } from "@src/presentation/controllers/health.controller";
import { getDatabaseStatus } from "@src/infrastructure/database/config.ts";
import { createRequestMock, createResponseMock, type ResponseMock } from "../../../helpers/http-mocks";

vi.mock("@src/infrastructure/database/config.ts", () => ({
  getDatabaseStatus: vi.fn(),
}));

const getDatabaseStatusMock = vi.mocked(getDatabaseStatus);

describe("healthController", () => {
  let res: ResponseMock;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
  });

  it("should answer 200 when the database is connected", async () => {
    getDatabaseStatusMock.mockResolvedValue({ status: "connected", provider: "memory" });

    await healthController(createRequestMock(), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "ok",
        database: { status: "connected", provider: "memory" },
      }),
    );
  });

  it("should answer 503 and expose the error when the database is unreachable", async () => {
    getDatabaseStatusMock.mockResolvedValue({
      status: "disconnected",
      provider: "postgresql",
      error: "connection refused",
    });

    await healthController(createRequestMock(), res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        database: {
          status: "disconnected",
          provider: "postgresql",
          error: "connection refused",
        },
      }),
    );
  });
});
