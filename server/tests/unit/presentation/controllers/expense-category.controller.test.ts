import { ExpenseCategoryController } from "@src/presentation/controllers/expense-category.controller";
import type { ExpenseCategoryService } from "@src/application/services/expense-category.service";
import {
  ExpenseCategoryHasLinkedExpensesError,
  ExpenseCategoryNameAlreadyExistsError,
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

const category = { id: "cat-1", name: "Transporte" };

describeControllerContract(
  "ExpenseCategoryController",
  () => {
    const service = createServiceMock(["create", "getById", "list", "update", "delete"]);
    return {
      service,
      controller: new ExpenseCategoryController(
        service as unknown as ExpenseCategoryService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "create",
      request: { body: { name: "Transporte" } },
      expectedArgs: ["user-1", { name: "Transporte" }],
      successStatus: 201,
      successResult: category,
      mappedErrors: [
        { error: new ExpenseCategoryNameAlreadyExistsError("Transporte"), status: 409 },
      ],
    },
    {
      method: "getById",
      delegatesTo: "getById",
      request: { params: { id: "cat-1" } },
      expectedArgs: ["user-1", "cat-1"],
      successStatus: 200,
      successResult: category,
      mappedErrors: [{ error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 }],
    },
    {
      method: "list",
      delegatesTo: "list",
      expectedArgs: ["user-1"],
      successStatus: 200,
      successResult: [category],
    },
    {
      method: "update",
      delegatesTo: "update",
      request: { params: { id: "cat-1" }, body: { name: "Saúde" } },
      expectedArgs: ["user-1", "cat-1", { name: "Saúde" }],
      successStatus: 200,
      successResult: category,
      mappedErrors: [
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
        { error: new ExpenseCategoryNameAlreadyExistsError("Saúde"), status: 409 },
      ],
    },
    {
      method: "delete",
      delegatesTo: "delete",
      request: { params: { id: "cat-1" } },
      expectedArgs: ["user-1", "cat-1"],
      successStatus: 204,
      mappedErrors: [
        { error: new ExpenseCategoryNotFoundError("cat-1"), status: 404 },
        { error: new ExpenseCategoryHasLinkedExpensesError(), status: 409 },
      ],
    },
  ],
);
