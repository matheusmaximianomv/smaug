import { UserController } from "@src/presentation/controllers/user.controller";
import type { UserService } from "@src/application/services/user.service";
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
    const service = createServiceMock(["getProfile"]);
    return {
      service,
      controller: new UserController(
        service as unknown as UserService,
      ) as unknown as ControllerMock,
    };
  },
  [
    {
      method: "me",
      delegatesTo: "getProfile",
      expectedArgs: ["user-1"],
      successStatus: 200,
      successResult: user,
      mappedErrors: [{ error: new UserNotFoundError("user-1"), status: 404 }],
    },
  ],
);
