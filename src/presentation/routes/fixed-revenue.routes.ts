import { Router } from "express";
import { FixedRevenueController } from "@src/presentation/controllers/fixed-revenue.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import { createFixedRevenueSchema, updateFixedRevenueSchema, terminateFixedRevenueSchema } from "@src/application/dtos/fixed-revenue.dto";

export function createFixedRevenueRoutes(controller: FixedRevenueController): Router {
  const router = Router();

  router.post("/", validateRequest(createFixedRevenueSchema), controller.create.bind(controller));
  router.get("/", controller.list.bind(controller));
  router.get("/:id", controller.getById.bind(controller));
  router.patch("/:id", validateRequest(updateFixedRevenueSchema), controller.update.bind(controller));
  router.patch("/:id/terminate", validateRequest(terminateFixedRevenueSchema), controller.terminate.bind(controller));
  router.delete("/:id", controller.delete.bind(controller));

  return router;
}
