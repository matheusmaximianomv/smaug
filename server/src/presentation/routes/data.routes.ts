import { Router } from "express";
import { DataController } from "@src/presentation/controllers/data.controller";
import { validateQuery } from "@src/presentation/middlewares/validate-request.middleware";
import { dataExportQuerySchema } from "@src/application/dtos/data-export.dto";

export function createDataRoutes(controller: DataController): Router {
  const router = Router();

  router.get(
    "/export/summary",
    validateQuery(dataExportQuerySchema),
    controller.exportSummary.bind(controller),
  );
  router.get(
    "/export",
    validateQuery(dataExportQuerySchema),
    controller.exportCsv.bind(controller),
  );
  router.post("/import/preview", controller.importPreview.bind(controller));
  router.post("/import", controller.importEntries.bind(controller));

  return router;
}
