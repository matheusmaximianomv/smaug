import { Router } from "express";
import { ExpenseQueryController } from "@src/presentation/controllers/expense-query.controller";
import { yearSummaryQuerySchema } from "@src/application/dtos/competence.dto";
import { validateQuery } from "@src/presentation/middlewares/validate-request.middleware";
import { expenseQuerySchema } from "@src/application/dtos/expense-query.dto";

export function createExpenseQueryRoutes(controller: ExpenseQueryController): Router {
  const router = Router();

  // Antes de "/": é o mesmo router de consulta, e a ordem de registro decide o casamento.
  router.get(
    "/summary",
    validateQuery(yearSummaryQuerySchema),
    controller.summary.bind(controller),
  );
  router.get("/", validateQuery(expenseQuerySchema), controller.query.bind(controller));

  return router;
}
