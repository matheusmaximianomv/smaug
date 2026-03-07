import { Router } from "express";
import { UserController } from "@src/presentation/controllers/user.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import { createUserSchema } from "@src/application/dtos/user.dto";

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  router.post("/", validateRequest(createUserSchema), userController.create.bind(userController));
  router.get("/:id", userController.getById.bind(userController));

  return router;
}
