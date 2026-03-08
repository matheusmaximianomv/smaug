import { Router } from "express";
import { ExpenseCategoryController } from "@src/presentation/controllers/expense-category.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
} from "@src/application/dtos/expense-category.dto";

export function createExpenseCategoryRoutes(controller: ExpenseCategoryController): Router {
  const router = Router();

  router.post("/", validateRequest(createExpenseCategorySchema), controller.create.bind(controller));
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.getById.bind(controller));
  router.put(
    "/:id",
    validateRequest(updateExpenseCategorySchema),
    controller.update.bind(controller),
  );
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
