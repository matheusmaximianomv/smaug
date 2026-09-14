import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { DataController } from "@src/presentation/controllers/data.controller";
import { DataExportService } from "@src/application/services/data-export.service";
import { DataImportService } from "@src/application/services/data-import.service";
import {
  ExportPeriodInvalidError,
  ExportPeriodTooLongError,
  ImportEmptyFileError,
  ImportMissingColumnsError,
  ImportNoValidRowsError,
} from "@src/domain/errors/domain-error";

const USER_ID = "user-1";
const PERIOD_QUERY = {
  mode: "period",
  startYear: "2026",
  startMonth: "4",
  endYear: "2026",
  endMonth: "4",
};

describe("DataController", () => {
  const exportService = {
    getSummary: vi.fn(),
    exportCsv: vi.fn(),
  } as unknown as DataExportService;

  const importService = {
    preview: vi.fn(),
    import: vi.fn(),
  } as unknown as DataImportService;

  const controller = new DataController(exportService, importService);

  let res: Response;
  let next: NextFunction;

  function request(overrides: Partial<Request> = {}): Request {
    return { userId: USER_ID, query: {}, body: "", ...overrides } as unknown as Request;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    } as unknown as Response;
    next = vi.fn();
  });

  describe("exportSummary", () => {
    it("should answer 200 with the summary", async () => {
      const summary = {
        total: 3,
        revenues: 1,
        expenses: 2,
        periodStart: "2026-04",
        periodEnd: "2026-04",
      };
      vi.mocked(exportService.getSummary).mockResolvedValue(summary);

      await controller.exportSummary(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(summary);
    });

    it("should pass the authenticated user and the parsed query to the service", async () => {
      vi.mocked(exportService.getSummary).mockResolvedValue({} as never);

      await controller.exportSummary(request({ query: PERIOD_QUERY as never }), res, next);

      expect(exportService.getSummary).toHaveBeenCalledWith(USER_ID, {
        mode: "period",
        startYear: 2026,
        startMonth: 4,
        endYear: 2026,
        endMonth: 4,
      });
    });

    it("should forward an unexpected failure to next", async () => {
      const failure = new Error("boom");
      vi.mocked(exportService.getSummary).mockRejectedValue(failure);

      await controller.exportSummary(request({ query: PERIOD_QUERY as never }), res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });

  describe("exportCsv", () => {
    beforeEach(() => {
      vi.mocked(exportService.exportCsv).mockResolvedValue({
        filename: "smaug-lancamentos-2026-09-14.csv",
        content: "﻿competencia\r\n",
      });
    });

    it("should answer 200 with the file body", async () => {
      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith("﻿competencia\r\n");
    });

    it("should declare the CSV content type with its charset", async () => {
      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    });

    it("should offer the file as a download named by the service", async () => {
      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "Content-Disposition",
        'attachment; filename="smaug-lancamentos-2026-09-14.csv"',
      );
    });

    it("should map an inverted period to 400", async () => {
      vi.mocked(exportService.exportCsv).mockRejectedValue(new ExportPeriodInvalidError());

      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "EXPORT_PERIOD_INVALID",
        message: "Export end competence must be on or after the start competence",
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should map an oversized period to 400", async () => {
      vi.mocked(exportService.exportCsv).mockRejectedValue(new ExportPeriodTooLongError());

      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "EXPORT_PERIOD_TOO_LONG" }),
      );
    });

    it("should forward an unexpected failure to next", async () => {
      const failure = new Error("boom");
      vi.mocked(exportService.exportCsv).mockRejectedValue(failure);

      await controller.exportCsv(request({ query: PERIOD_QUERY as never }), res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });

  describe("importPreview", () => {
    it("should answer 200 with the preview", async () => {
      const preview = {
        validRows: 2,
        errors: [],
        counts: { oneTime: 2, fixed: 0, installment: 0, recurring: 0, series: 0 },
      };
      vi.mocked(importService.preview).mockReturnValue(preview);

      await controller.importPreview(request({ body: "csv" }), res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(preview);
    });

    it("should read the raw text body", async () => {
      vi.mocked(importService.preview).mockReturnValue({} as never);

      await controller.importPreview(request({ body: "competencia;natureza" }), res, next);

      expect(importService.preview).toHaveBeenCalledWith("competencia;natureza");
    });

    it("should treat a non-text body as empty content", async () => {
      vi.mocked(importService.preview).mockReturnValue({} as never);

      await controller.importPreview(request({ body: {} as never }), res, next);

      expect(importService.preview).toHaveBeenCalledWith("");
    });

    it("should map an empty file to 400", async () => {
      vi.mocked(importService.preview).mockImplementation(() => {
        throw new ImportEmptyFileError();
      });

      await controller.importPreview(request(), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "IMPORT_EMPTY_FILE" }),
      );
    });

    it("should map a missing column to 400", async () => {
      vi.mocked(importService.preview).mockImplementation(() => {
        throw new ImportMissingColumnsError(["valor"]);
      });

      await controller.importPreview(request(), res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "IMPORT_MISSING_COLUMNS" }),
      );
    });

    it("should forward an unexpected failure to next", async () => {
      const failure = new Error("boom");
      vi.mocked(importService.preview).mockImplementation(() => {
        throw failure;
      });

      await controller.importPreview(request(), res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });

  describe("importEntries", () => {
    it("should answer 201 with the import result", async () => {
      const result = {
        total: 1,
        created: {
          oneTimeRevenues: 1,
          fixedRevenues: 0,
          oneTimeExpenses: 0,
          installmentExpenses: 0,
          recurringExpenses: 0,
        },
        categoriesCreated: 0,
      };
      vi.mocked(importService.import).mockResolvedValue(result);

      await controller.importEntries(request({ body: "csv" }), res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it("should import on behalf of the authenticated user", async () => {
      vi.mocked(importService.import).mockResolvedValue({} as never);

      await controller.importEntries(request({ body: "csv" }), res, next);

      expect(importService.import).toHaveBeenCalledWith(USER_ID, "csv");
    });

    it("should map a file with no valid rows to 422", async () => {
      vi.mocked(importService.import).mockRejectedValue(new ImportNoValidRowsError());

      await controller.importEntries(request({ body: "csv" }), res, next);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "IMPORT_NO_VALID_ROWS" }),
      );
    });

    it("should forward an unexpected failure to next", async () => {
      const failure = new Error("boom");
      vi.mocked(importService.import).mockRejectedValue(failure);

      await controller.importEntries(request({ body: "csv" }), res, next);

      expect(next).toHaveBeenCalledWith(failure);
    });
  });
});
