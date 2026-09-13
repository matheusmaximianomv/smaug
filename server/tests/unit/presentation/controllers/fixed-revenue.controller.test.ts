import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { FixedRevenueController } from "@src/presentation/controllers/fixed-revenue.controller";
import type { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import { PastStartDateError } from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import {
  UnalterableRevenueError,
  PastEffectiveDateError,
  EffectiveDateBeforeStartError,
  EffectiveDateAfterEndError,
  VersionConflictError,
} from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import {
  AlreadyExpiredError,
  PastTerminationDateError,
} from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
  type ServiceMock,
} from "../../../helpers/controller-contract";
import { createRequestMock, createResponseMock } from "../../../helpers/http-mocks";

const fixedRevenue = { id: "fixed-1", modality: "ALTERABLE" };

const buildController = () => {
  const service = createServiceMock([
    "create",
    "getById",
    "list",
    "update",
    "terminate",
    "delete",
  ]);
  return {
    service,
    controller: new FixedRevenueController(
      service as unknown as FixedRevenueService,
    ) as unknown as ControllerMock,
  };
};

describeControllerContract("FixedRevenueController", buildController, [
  {
    method: "create",
    delegatesTo: "create",
    request: { body: { description: "Salário", amount: 8500 } },
    expectedArgs: ["user-1", { description: "Salário", amount: 8500 }],
    successStatus: 201,
    successResult: fixedRevenue,
    mappedErrors: [{ error: new PastStartDateError(), status: 409 }],
  },
  {
    method: "getById",
    delegatesTo: "getById",
    request: { params: { id: "fixed-1" } },
    expectedArgs: ["user-1", "fixed-1"],
    successStatus: 200,
    successResult: fixedRevenue,
    mappedErrors: [{ error: new FixedRevenueNotFoundError("fixed-1"), status: 404 }],
  },
  {
    method: "list",
    delegatesTo: "list",
    successStatus: 200,
    successResult: [fixedRevenue],
  },
  {
    method: "update",
    delegatesTo: "update",
    request: { params: { id: "fixed-1" }, body: { amount: 9000 } },
    expectedArgs: ["user-1", "fixed-1", { amount: 9000 }],
    successStatus: 200,
    successResult: fixedRevenue,
    mappedErrors: [
      { error: new FixedRevenueNotFoundError("fixed-1"), status: 404 },
      { error: new UnalterableRevenueError(), status: 409 },
      { error: new PastEffectiveDateError(), status: 409 },
      { error: new EffectiveDateBeforeStartError(), status: 409 },
      { error: new EffectiveDateAfterEndError(), status: 409 },
      { error: new VersionConflictError(4, 2026), status: 409 },
    ],
  },
  {
    method: "terminate",
    delegatesTo: "terminate",
    request: { params: { id: "fixed-1" }, body: { endMonth: 8, endYear: 2026 } },
    expectedArgs: ["user-1", "fixed-1", { endMonth: 8, endYear: 2026 }],
    successStatus: 200,
    successResult: fixedRevenue,
    mappedErrors: [
      { error: new FixedRevenueNotFoundError("fixed-1"), status: 404 },
      { error: new AlreadyExpiredError(), status: 409 },
      { error: new PastTerminationDateError(), status: 409 },
    ],
  },
  {
    method: "delete",
    delegatesTo: "delete",
    request: { params: { id: "fixed-1" } },
    expectedArgs: ["user-1", "fixed-1"],
    successStatus: 204,
    mappedErrors: [{ error: new FixedRevenueNotFoundError("fixed-1"), status: 404 }],
  },
]);

describe("FixedRevenueController competence filters", () => {
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
