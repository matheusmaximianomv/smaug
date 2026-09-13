import { OneTimeExpenseController } from "@src/presentation/controllers/one-time-expense.controller";
import type { OneTimeExpenseService } from "@src/application/services/one-time-expense.service";
import {
  OneTimeExpensePastCompetenceCreateError,
  OneTimeExpensePastCompetenceEditError,
  OneTimeExpensePastCompetenceDeleteError,
  OneTimeExpenseNotFoundError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

const expense = { id: "expense-1", description: "Jantar" };

describeControllerContract(
  "OneTimeExpenseController",
  () => {
    const service = createServiceMock(["create", "list", "update", "delete"]);
    return {
      service,
      controller: new OneTimeExpenseController(
        service as unknown as OneTimeExpenseService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "create",
      request: { body: { description: "Jantar", amount: 150 } },
      expectedArgs: ["user-1", { description: "Jantar", amount: 150 }],
      successStatus: 201,
      successResult: expense,
      mappedErrors: [
        { error: new OneTimeExpensePastCompetenceCreateError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "list",
      delegatesTo: "list",
      request: {
        validatedQuery: { competenceYear: 2026, competenceMonth: 3 },
      } as never,
      expectedArgs: ["user-1", { competenceYear: 2026, competenceMonth: 3 }],
      successStatus: 200,
      successResult: [expense],
      mappedErrors: [{ error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 }],
    },
    {
      method: "update",
      delegatesTo: "update",
      request: { params: { id: "expense-1" }, body: { amount: 180 } },
      expectedArgs: ["user-1", "expense-1", { amount: 180 }],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [
        { error: new OneTimeExpenseNotFoundError("expense-1"), status: 404 },
        { error: new OneTimeExpensePastCompetenceEditError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "delete",
      delegatesTo: "delete",
      request: { params: { id: "expense-1" } },
      expectedArgs: ["user-1", "expense-1"],
      successStatus: 204,
      mappedErrors: [
        { error: new OneTimeExpenseNotFoundError("expense-1"), status: 404 },
        { error: new OneTimeExpensePastCompetenceDeleteError(), status: 409 },
      ],
    },
  ],
);
