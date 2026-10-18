import { Router } from "express";
import { UserController } from "@src/presentation/controllers/user.controller";

export function createUserRoutes(userController: UserController): Router {
  const router = Router();

  router.get("/me", userController.me.bind(userController));

  return router;
}
