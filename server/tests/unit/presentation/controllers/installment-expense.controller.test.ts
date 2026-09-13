import { InstallmentExpenseController } from "@src/presentation/controllers/installment-expense.controller";
import type { InstallmentExpenseService } from "@src/application/services/installment-expense.service";
import {
  InstallmentExpensePastStartError,
  InstallmentExpenseNotFoundError,
  InstallmentFinancialImmutableError,
  InstallmentHasPastCompetenceError,
  NoFutureInstallmentsError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

const expense = { id: "expense-1", description: "Notebook" };

describeControllerContract(
  "InstallmentExpenseController",
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
      controller: new InstallmentExpenseController(
        service as unknown as InstallmentExpenseService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "create",
      request: { body: { description: "Notebook", totalAmount: 1000 } },
      expectedArgs: ["user-1", { description: "Notebook", totalAmount: 1000 }],
      successStatus: 201,
      successResult: expense,
      mappedErrors: [
        { error: new InstallmentExpensePastStartError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "get",
      delegatesTo: "get",
      request: { params: { id: "expense-1" } },
      expectedArgs: ["user-1", "expense-1"],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [{ error: new InstallmentExpenseNotFoundError("expense-1"), status: 404 }],
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
      request: { params: { id: "expense-1" }, body: { description: "Notebook novo" } },
      expectedArgs: ["user-1", "expense-1", { description: "Notebook novo" }],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [
        { error: new InstallmentExpenseNotFoundError("expense-1"), status: 404 },
        { error: new InstallmentFinancialImmutableError(), status: 409 },
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
      ],
    },
    {
      method: "terminate",
      delegatesTo: "terminate",
      request: { params: { id: "expense-1" } },
      expectedArgs: ["user-1", "expense-1"],
      successStatus: 200,
      successResult: expense,
      mappedErrors: [
        { error: new InstallmentExpenseNotFoundError("expense-1"), status: 404 },
        { error: new NoFutureInstallmentsError(), status: 409 },
      ],
    },
    {
      method: "delete",
      delegatesTo: "delete",
      request: { params: { id: "expense-1" } },
      expectedArgs: ["user-1", "expense-1"],
      successStatus: 204,
      mappedErrors: [
        { error: new InstallmentExpenseNotFoundError("expense-1"), status: 404 },
        { error: new InstallmentHasPastCompetenceError(), status: 409 },
      ],
    },
  ],
);
