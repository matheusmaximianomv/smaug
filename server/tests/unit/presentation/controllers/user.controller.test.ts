import { UserController } from "@src/presentation/controllers/user.controller";
import type { UserService } from "@src/application/services/user.service";
import { EmailAlreadyExistsError } from "@src/domain/use-cases/user/create-user.use-case";
import { UserNotFoundError } from "@src/domain/use-cases/user/get-user.use-case";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";

const user = { id: "user-1", name: "Ana", email: "ana@example.com" };

describeControllerContract(
  "UserController",
  () => {
    const service = createServiceMock(["createUser", "getUserById"]);
    return {
      service,
      controller: new UserController(service as unknown as UserService) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "create",
      delegatesTo: "createUser",
      request: { body: { name: "Ana", email: "ana@example.com" } },
      expectedArgs: [{ name: "Ana", email: "ana@example.com" }],
      successStatus: 201,
      successResult: user,
      mappedErrors: [{ error: new EmailAlreadyExistsError("ana@example.com"), status: 409 }],
    },
    {
      method: "getById",
      delegatesTo: "getUserById",
      request: { params: { id: "user-1" } },
      expectedArgs: ["user-1"],
      successStatus: 200,
      successResult: user,
      mappedErrors: [{ error: new UserNotFoundError("user-1"), status: 404 }],
    },
  ],
);
