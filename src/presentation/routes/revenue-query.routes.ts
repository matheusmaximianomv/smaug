import { Router } from "express";
import { RevenueQueryController } from "@src/presentation/controllers/revenue-query.controller";
import { validateQuery } from "@src/presentation/middlewares/validate-request.middleware";
import { revenueQuerySchema } from "@src/application/dtos/revenue-query.dto";

export function createRevenueQueryRoutes(controller: RevenueQueryController): Router {
  const router = Router();

  router.get("/", validateQuery(revenueQuerySchema), controller.query.bind(controller));

  return router;
}
