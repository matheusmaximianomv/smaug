import { Router } from "express";
import { OneTimeExpenseController } from "@src/presentation/controllers/one-time-expense.controller";
import {
  createOneTimeExpenseSchema,
  listOneTimeExpenseQuerySchema,
  updateOneTimeExpenseSchema,
} from "@src/application/dtos/one-time-expense.dto";
import { validateRequest, validateQuery } from "@src/presentation/middlewares/validate-request.middleware";

export function createOneTimeExpenseRoutes(controller: OneTimeExpenseController): Router {
  const router = Router();

  router.post("/", validateRequest(createOneTimeExpenseSchema), controller.create.bind(controller));
  router.get(
    "/",
    validateQuery(listOneTimeExpenseQuerySchema),
    controller.list.bind(controller),
  );
  router.put(
    "/:id",
    validateRequest(updateOneTimeExpenseSchema),
    controller.update.bind(controller),
  );
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
