import { Router } from "express";
import { OneTimeRevenueController } from "@src/presentation/controllers/one-time-revenue.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import {
  createOneTimeRevenueSchema,
  updateOneTimeRevenueSchema,
} from "@src/application/dtos/one-time-revenue.dto";

export function createOneTimeRevenueRoutes(controller: OneTimeRevenueController): Router {
  const router = Router();

  router.post("/", validateRequest(createOneTimeRevenueSchema), controller.create);
  router.get("/", controller.list);
  router.put("/:id", validateRequest(updateOneTimeRevenueSchema), controller.update);
  router.delete("/:id", controller.delete);

  return router;
}
