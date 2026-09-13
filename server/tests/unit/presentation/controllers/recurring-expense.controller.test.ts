import { RecurringExpenseController } from "@src/presentation/controllers/recurring-expense.controller";
import type { RecurringExpenseService } from "@src/application/services/recurring-expense.service";
import {
  PastCompetenceError,
  ExpenseCategoryNotFoundError,
  RecurringExpenseNotFoundError,
  PastEffectiveDateError,
  EffectiveDateOutOfRangeError,
  RecurringExpenseAlreadyExpiredError,
  EndDateBeforeStartError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

const expense = { id: "recurring-1", description: "Aluguel" };

describeControllerContract(
  "RecurringExpenseController",
  () => {
    const service = createServiceMock([
      "create",
      "get",
      "list",
      "update",
      "terminate",
      "delete",
    ]);
    return {
      service,
      controller: new RecurringExpenseController(
        service as unknown as RecurringExpenseService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "create",
      request: { body: { description: "Aluguel", amount: 2000 } },
      expectedArgs: ["user-1", { description: "Aluguel", amount: 2000 }],
      successStatus: 201,
      successResult: expense,
      mappedErrors: [
        { error: new PastCompetenceError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "get",
      delegatesTo: "get",
      request: { params: { id: "recurring-1" } },
      expectedArgs: ["user-1", "recurring-1"],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [{ error: new RecurringExpenseNotFoundError("recurring-1"), status: 404 }],
    },
    {
      method: "list",
      delegatesTo: "list",
      expectedArgs: ["user-1"],
      successStatus: 200,
      successResult: [expense],
      mappedErrors: [{ error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 }],
    },
    {
      method: "update",
      delegatesTo: "update",
      request: { params: { id: "recurring-1" }, body: { amount: 2100 } },
      expectedArgs: ["user-1", "recurring-1", { amount: 2100 }],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [
        { error: new RecurringExpenseNotFoundError("recurring-1"), status: 404 },
        { error: new PastEffectiveDateError(), status: 409 },
        { error: new EffectiveDateOutOfRangeError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "terminate",
      delegatesTo: "terminate",
      request: { params: { id: "recurring-1" }, body: { endMonth: 8, endYear: 2026 } },
      expectedArgs: ["user-1", "recurring-1", { endMonth: 8, endYear: 2026 }],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [
        { error: new RecurringExpenseNotFoundError("recurring-1"), status: 404 },
        { error: new PastCompetenceError(), status: 409 },
        { error: new RecurringExpenseAlreadyExpiredError(), status: 409 },
        { error: new EndDateBeforeStartError(), status: 409 },
      ],
    },
    {
      method: "delete",
      delegatesTo: "delete",
      request: { params: { id: "recurring-1" } },
      expectedArgs: ["user-1", "recurring-1"],
      successStatus: 204,
      mappedErrors: [{ error: new RecurringExpenseNotFoundError("recurring-1"), status: 404 }],
    },
  ],
);
