import { Router } from "express";
import { InstallmentExpenseController } from "@src/presentation/controllers/installment-expense.controller";
import {
  createInstallmentExpenseSchema,
  updateInstallmentExpenseSchema,
} from "@src/application/dtos/installment-expense.dto";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";

export function createInstallmentExpenseRoutes(controller: InstallmentExpenseController): Router {
  const router = Router();

  router.post("/", validateRequest(createInstallmentExpenseSchema), controller.create.bind(controller));
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.get.bind(controller));
  router.patch("/:id", validateRequest(updateInstallmentExpenseSchema), controller.update.bind(controller));
  router.post("/:id/terminate", controller.terminate.bind(controller));
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
