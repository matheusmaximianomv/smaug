import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { OneTimeRevenueController } from "@src/presentation/controllers/one-time-revenue.controller";
import type { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { PastCompetenceError } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import {
  RevenueNotFoundError,
  PastCompetenceEditError,
} from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
  type ServiceMock,
} from "../../../helpers/controller-contract";
import { createRequestMock, createResponseMock } from "../../../helpers/http-mocks";

const revenue = { id: "rev-1", description: "Bônus", amount: 1200 };

const buildController = () => {
  const service = createServiceMock(["create", "list", "update", "delete"]);
  return {
    service,
    controller: new OneTimeRevenueController(
      service as unknown as OneTimeRevenueService,
    ) as unknown as ControllerMock,
  };
};

describeControllerContract("OneTimeRevenueController", buildController, [
  {
    method: "create",
    delegatesTo: "create",
    request: { body: { description: "Bônus", amount: 1200 } },
    expectedArgs: ["user-1", { description: "Bônus", amount: 1200 }],
    successStatus: 201,
    successResult: revenue,
    mappedErrors: [{ error: new PastCompetenceError(), status: 409 }],
  },
  {
    method: "list",
    delegatesTo: "list",
    successStatus: 200,
    successResult: [revenue],
  },
  {
    method: "update",
    delegatesTo: "update",
    request: { params: { id: "rev-1" }, body: { amount: 1500 } },
    expectedArgs: ["user-1", "rev-1", { amount: 1500 }],
    successStatus: 200,
    successResult: revenue,
    mappedErrors: [
      { error: new RevenueNotFoundError("rev-1"), status: 404 },
      { error: new PastCompetenceEditError(), status: 409 },
    ],
  },
  {
    method: "delete",
    delegatesTo: "delete",
    request: { params: { id: "rev-1" } },
    expectedArgs: ["user-1", "rev-1"],
    successStatus: 204,
    mappedErrors: [
      { error: new RevenueNotFoundError("rev-1"), status: 404 },
      { error: new PastCompetenceEditError(), status: 409 },
    ],
  },
]);

describe("OneTimeRevenueController competence filters", () => {
  let controller: ControllerMock;
  let service: ServiceMock;
  let next: NextFunction;

  beforeEach(() => {
    ({ controller, service } = buildController());
    service.list.mockResolvedValue([]);
    next = vi.fn();
  });

  it("should convert the competence query parameters to numbers", async () => {
    await controller.list(
      createRequestMock({ query: { competenceYear: "2026", competenceMonth: "3" } }),
      createResponseMock(),
      next,
    );

    expect(service.list).toHaveBeenCalledWith("user-1", {
      competenceYear: 2026,
      competenceMonth: 3,
    });
  });

  it("should leave the filters undefined when the query is empty", async () => {
    await controller.list(createRequestMock(), createResponseMock(), next);

    expect(service.list).toHaveBeenCalledWith("user-1", {
      competenceYear: undefined,
      competenceMonth: undefined,
    });
  });
});
