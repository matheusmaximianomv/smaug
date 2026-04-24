import { Router } from "express";
import { RecurringExpenseController } from "@src/presentation/controllers/recurring-expense.controller";
import {
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
  terminateRecurringExpenseSchema,
} from "@src/application/dtos/recurring-expense.dto";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";

export function createRecurringExpenseRoutes(controller: RecurringExpenseController): Router {
  const router = Router();

  router.post("/", validateRequest(createRecurringExpenseSchema), controller.create.bind(controller));
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.get.bind(controller));
  router.patch("/:id", validateRequest(updateRecurringExpenseSchema), controller.update.bind(controller));
  router.patch(
    "/:id/terminate",
    validateRequest(terminateRecurringExpenseSchema),
    controller.terminate.bind(controller),
  );
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
