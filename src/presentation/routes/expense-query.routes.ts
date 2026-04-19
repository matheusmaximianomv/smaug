import { Router } from "express";
import { ExpenseQueryController } from "@src/presentation/controllers/expense-query.controller";
import { validateQuery } from "@src/presentation/middlewares/validate-request.middleware";
import { expenseQuerySchema } from "@src/application/dtos/expense-query.dto";

export function createExpenseQueryRoutes(controller: ExpenseQueryController): Router {
  const router = Router();

  router.get("/", validateQuery(expenseQuerySchema), controller.query.bind(controller));

  return router;
}
