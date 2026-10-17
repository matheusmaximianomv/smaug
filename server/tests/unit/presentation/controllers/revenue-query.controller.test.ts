import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { RevenueQueryController } from "@src/presentation/controllers/revenue-query.controller";
import type { RevenueQueryService } from "@src/application/services/revenue-query.service";
import {
  createRequestMock,
  createResponseMock,
  type ResponseMock,
} from "../../../helpers/http-mocks";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

describe("RevenueQueryController", () => {
  const service = { getConsolidatedRevenues: vi.fn() };
  const controller = new RevenueQueryController(service as unknown as RevenueQueryService);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should convert the competence query parameters and return the consolidated revenues", async () => {
    const payload = { competenceYear: 2026, competenceMonth: 3 };
    service.getConsolidatedRevenues.mockResolvedValue(payload);

    await controller.query(
      createRequestMock({ query: { competenceYear: "2026", competenceMonth: "3" } }),
      res,
      next,
    );

    expect(service.getConsolidatedRevenues).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward unexpected errors to next", async () => {
    const unexpected = new Error("database is down");
    service.getConsolidatedRevenues.mockRejectedValue(unexpected);

    await controller.query(
      createRequestMock({ query: { competenceYear: "2026", competenceMonth: "3" } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(unexpected);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describeControllerContract(
  "RevenueQueryController contract",
  () => {
    const service = createServiceMock(["getConsolidatedRevenues", "getYearSummary"]);
    const controller = new RevenueQueryController(service as unknown as RevenueQueryService);
    return { controller: controller as unknown as ControllerMock, service };
  },
  [
    {
      method: "summary",
      delegatesTo: "getYearSummary",
      request: { query: { year: "2026" } },
      expectedArgs: ["user-1", 2026],
      successStatus: 200,
      successResult: { year: 2026, reference: { year: 2026, month: 4 }, months: [] },
    },
  ],
);

describe("RevenueQueryController.summary validation", () => {
  it("should forward a missing year to next without calling the service", async () => {
    const service = createServiceMock(["getYearSummary"]);
    const controller = new RevenueQueryController(service as unknown as RevenueQueryService);
    const next = vi.fn();

    await controller.summary(createRequestMock({ query: {} }), createResponseMock(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(service.getYearSummary).not.toHaveBeenCalled();
  });
});
