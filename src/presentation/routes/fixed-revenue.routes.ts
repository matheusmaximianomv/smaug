import { Router } from "express";
import { FixedRevenueController } from "@src/presentation/controllers/fixed-revenue.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import { createFixedRevenueSchema, updateFixedRevenueSchema, terminateFixedRevenueSchema } from "@src/application/dtos/fixed-revenue.dto";

export function createFixedRevenueRoutes(controller: FixedRevenueController): Router {
  const router = Router();

  router.post("/", validateRequest(createFixedRevenueSchema), controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.patch("/:id", validateRequest(updateFixedRevenueSchema), controller.update);
  router.patch("/:id/terminate", validateRequest(terminateFixedRevenueSchema), controller.terminate);
  router.delete("/:id", controller.delete);

  return router;
}
