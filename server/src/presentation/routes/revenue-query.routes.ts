import { Router } from "express";
import { RevenueQueryController } from "@src/presentation/controllers/revenue-query.controller";
import { yearSummaryQuerySchema } from "@src/application/dtos/competence.dto";
import { validateQuery } from "@src/presentation/middlewares/validate-request.middleware";
import { revenueQuerySchema } from "@src/application/dtos/revenue-query.dto";

export function createRevenueQueryRoutes(controller: RevenueQueryController): Router {
  const router = Router();

  // Antes de "/": é o mesmo router de consulta, e a ordem de registro decide o casamento.
  router.get(
    "/summary",
    validateQuery(yearSummaryQuerySchema),
    controller.summary.bind(controller),
  );
  router.get("/", validateQuery(revenueQuerySchema), controller.query.bind(controller));

  return router;
}
