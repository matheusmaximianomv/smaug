import { Request, Response, NextFunction } from "express";
import { DataExportService } from "@src/application/services/data-export.service";
import { DataImportService } from "@src/application/services/data-import.service";
import { dataExportQuerySchema } from "@src/application/dtos/data-export.dto";
import {
  ExportPeriodInvalidError,
  ExportPeriodTooLongError,
  ImportEmptyFileError,
  ImportMissingColumnsError,
  ImportNoValidRowsError,
} from "@src/domain/errors/domain-error";

export class DataController {
  public constructor(
    private readonly exportService: DataExportService,
    private readonly importService: DataImportService,
  ) {}

  public async exportSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dataExportQuerySchema.parse(req.query);
      const summary = await this.exportService.getSummary(req.userId!, query);
      res.status(200).json(summary);
    } catch (error) {
      DataController.handle(error, res, next);
    }
  }

  public async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = dataExportQuerySchema.parse(req.query);
      const { filename, content } = await this.exportService.exportCsv(req.userId!, query);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(content);
    } catch (error) {
      DataController.handle(error, res, next);
    }
  }

  public async importPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const preview = this.importService.preview(DataController.readBody(req));
      res.status(200).json(preview);
    } catch (error) {
      DataController.handle(error, res, next);
    }
  }

  public async importEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.importService.import(req.userId!, DataController.readBody(req));
      res.status(201).json(result);
    } catch (error) {
      DataController.handle(error, res, next);
    }
  }

  /** `express.text` entrega string; qualquer outro content-type chega como objeto vazio. */
  private static readBody(req: Request): string {
    return typeof req.body === "string" ? req.body : "";
  }

  private static handle(error: unknown, res: Response, next: NextFunction): void {
    if (error instanceof ExportPeriodInvalidError || error instanceof ExportPeriodTooLongError) {
      res.status(400).json({ error: error.code, message: error.message });
      return;
    }
    if (error instanceof ImportEmptyFileError || error instanceof ImportMissingColumnsError) {
      res.status(400).json({ error: error.code, message: error.message });
      return;
    }
    if (error instanceof ImportNoValidRowsError) {
      res.status(422).json({ error: error.code, message: error.message });
      return;
    }
    next(error);
  }
}
