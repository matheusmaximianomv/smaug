import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { ExpenseQueryController } from "@src/presentation/controllers/expense-query.controller";
import type { ExpenseQueryService } from "@src/application/services/expense-query.service";
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

describe("ExpenseQueryController", () => {
  const service = { getConsolidatedExpenses: vi.fn() };
  const controller = new ExpenseQueryController(service as unknown as ExpenseQueryService);

  let res: ResponseMock;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should parse the query and return the consolidated expenses", async () => {
    const payload = { competenceYear: 2026, competenceMonth: 3, items: [] };
    service.getConsolidatedExpenses.mockResolvedValue(payload);

    await controller.query(
      createRequestMock({ query: { competenceYear: "2026", competenceMonth: "3" } }),
      res,
      next,
    );

    expect(service.getConsolidatedExpenses).toHaveBeenCalledWith("user-1", {
      competenceYear: 2026,
      competenceMonth: 3,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(payload);
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward validation errors to next", async () => {
    await controller.query(createRequestMock({ query: {} }), res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(service.getConsolidatedExpenses).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("should forward unexpected errors to next", async () => {
    const unexpected = new Error("database is down");
    service.getConsolidatedExpenses.mockRejectedValue(unexpected);

    await controller.query(
      createRequestMock({ query: { competenceYear: "2026", competenceMonth: "3" } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(unexpected);
  });
});

describeControllerContract(
  "ExpenseQueryController contract",
  () => {
    const service = createServiceMock(["getConsolidatedExpenses", "getYearSummary"]);
    const controller = new ExpenseQueryController(service as unknown as ExpenseQueryService);
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

describe("ExpenseQueryController.summary validation", () => {
  it("should forward a missing year to next without calling the service", async () => {
    const service = createServiceMock(["getYearSummary"]);
    const controller = new ExpenseQueryController(service as unknown as ExpenseQueryService);
    const next = vi.fn();

    await controller.summary(createRequestMock({ query: {} }), createResponseMock(), next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(service.getYearSummary).not.toHaveBeenCalled();
  });
});
