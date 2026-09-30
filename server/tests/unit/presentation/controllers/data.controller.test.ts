import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextFunction } from "express";
import { DataController } from "@src/presentation/controllers/data.controller";
import type { DataExportService } from "@src/application/services/data-export.service";
import type { DataImportService } from "@src/application/services/data-import.service";
import {
  ExportPeriodInvalidError,
  ExportPeriodTooLongError,
  ImportEmptyFileError,
  ImportMissingColumnsError,
  ImportNoValidRowsError,
} from "@src/domain/errors/domain-error";
import {
  createServiceMock,
  describeControllerContract,
  type ControllerMock,
} from "../../../helpers/controller-contract";
import { createRequestMock, createResponseMock } from "../../../helpers/http-mocks";

const PERIOD_QUERY = {
  mode: "period" as const,
  startYear: 2026,
  startMonth: 4,
  endYear: 2026,
  endMonth: 4,
};

const SUMMARY = {
  total: 3,
  revenues: 1,
  expenses: 2,
  periodStart: "2026-04",
  periodEnd: "2026-04",
};

const PREVIEW = {
  validRows: 2,
  errors: [],
  counts: { oneTime: 2, fixed: 0, installment: 0, recurring: 0, series: 0 },
};

const IMPORT_RESULT = {
  total: 2,
  created: {
    oneTimeRevenues: 1,
    fixedRevenues: 0,
    oneTimeExpenses: 1,
    installmentExpenses: 0,
    recurringExpenses: 0,
  },
  categoriesCreated: 1,
};

/**
 * O controller tem duas dependências, e o helper de contrato expõe um service só. Como os quatro
 * nomes de método não colidem, o mesmo dublê serve às duas — é o que mantém a bateria padrão
 * valendo sem inventar um segundo formato de teste de controller.
 */
function setup() {
  const service = createServiceMock(["getSummary", "exportCsv", "preview", "import"]);
  return {
    service,
    controller: new DataController(
      service as unknown as DataExportService,
      service as unknown as DataImportService,
    ) as unknown as ControllerMock,
  };
}

describeControllerContract("DataController", setup, [
  {
    method: "exportSummary",
    delegatesTo: "getSummary",
    request: { validatedQuery: PERIOD_QUERY } as never,
    expectedArgs: ["user-1", PERIOD_QUERY],
    successStatus: 200,
    successResult: SUMMARY,
    mappedErrors: [
      { error: new ExportPeriodInvalidError(), status: 400 },
      { error: new ExportPeriodTooLongError(), status: 400 },
    ],
  },
  {
    method: "importPreview",
    delegatesTo: "preview",
    request: { body: "competencia;natureza" },
    expectedArgs: ["competencia;natureza"],
    successStatus: 200,
    successResult: PREVIEW,
    mappedErrors: [
      { error: new ImportEmptyFileError(), status: 400 },
      { error: new ImportMissingColumnsError(["valor"]), status: 400 },
    ],
  },
  {
    method: "importEntries",
    delegatesTo: "import",
    request: { body: "competencia;natureza" },
    expectedArgs: ["user-1", "competencia;natureza"],
    successStatus: 201,
    successResult: IMPORT_RESULT,
    mappedErrors: [
      { error: new ImportEmptyFileError(), status: 400 },
      { error: new ImportMissingColumnsError(["valor"]), status: 400 },
      { error: new ImportNoValidRowsError(), status: 422 },
    ],
  },
]);

/**
 * `exportCsv` fica fora da bateria porque é a única rota que responde `res.send()` com corpo e dois
 * headers — o helper assere `res.json` sempre que há resultado. Estender o `MethodContract` por um
 * caso só seria abstração especulativa.
 */
describe("DataController.exportCsv", () => {
  const { service, controller } = setup();
  let res: ReturnType<typeof createResponseMock>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  const request = () => createRequestMock({ validatedQuery: PERIOD_QUERY } as never);

  it("should respond with 200 and the csv body", async () => {
    service.exportCsv.mockResolvedValue({ filename: "arquivo.csv", content: "a;b" });

    await controller.exportCsv(request(), res, next);

    expect(service.exportCsv).toHaveBeenCalledWith("user-1", PERIOD_QUERY);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("a;b");
    expect(next).not.toHaveBeenCalled();
  });

  it("should offer the file as an attachment named by the service", async () => {
    service.exportCsv.mockResolvedValue({ filename: "arquivo.csv", content: "a;b" });

    await controller.exportCsv(request(), res, next);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv; charset=utf-8");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="arquivo.csv"',
    );
  });

  it("should respond with 400 for ExportPeriodInvalidError", async () => {
    const error = new ExportPeriodInvalidError();
    service.exportCsv.mockRejectedValue(error);

    await controller.exportCsv(request(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: error.code, message: error.message });
    expect(next).not.toHaveBeenCalled();
  });

  it("should respond with 400 for ExportPeriodTooLongError", async () => {
    const error = new ExportPeriodTooLongError();
    service.exportCsv.mockRejectedValue(error);

    await controller.exportCsv(request(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: error.code, message: error.message });
    expect(next).not.toHaveBeenCalled();
  });

  it("should forward unexpected errors to next", async () => {
    const unexpected = new Error("database is down");
    service.exportCsv.mockRejectedValue(unexpected);

    await controller.exportCsv(request(), res, next);

    expect(next).toHaveBeenCalledWith(unexpected);
    expect(res.status).not.toHaveBeenCalled();
  });
});

/**
 * `express.text` só popula `req.body` com string quando o content-type casa. Qualquer outro
 * content-type chega como objeto vazio, e o service precisa receber string mesmo assim — do
 * contrário a leitura do CSV estouraria antes de virar uma recusa com código.
 */
describe("DataController: corpo que não é texto", () => {
  const { service, controller } = setup();
  let res: ReturnType<typeof createResponseMock>;
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    res = createResponseMock();
    next = vi.fn();
  });

  it("should hand an empty string to the service when the body is not text", async () => {
    service.preview.mockResolvedValue(PREVIEW);

    await controller.importPreview(createRequestMock({ body: {} }), res, next);

    expect(service.preview).toHaveBeenCalledWith("");
  });
});
