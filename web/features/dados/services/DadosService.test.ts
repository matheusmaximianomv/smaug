import { describe, it, expect } from "vitest";
import { DadosService } from "./DadosService";
import { recordRequests, signatures } from "@/tests/requests";
import { mockApiError } from "@/tests/msw";
import { CSV_HEADER } from "@/tests/msw/handlers/data";

describe("DadosService", () => {
  describe("getExportSummary", () => {
    it("chama GET /data/export/summary", async () => {
      const calls = recordRequests();

      await DadosService.getExportSummary({ mode: "full" });

      expect(signatures(calls)).toEqual(["GET /data/export/summary"]);
    });

    it("envia o recorte como query string", async () => {
      const calls = recordRequests();

      await DadosService.getExportSummary({
        mode: "period",
        startYear: 2026,
        startMonth: 4,
        endYear: 2026,
        endMonth: 9,
      });

      expect(Object.fromEntries(calls[0]!.search)).toEqual({
        mode: "period",
        startYear: "2026",
        startMonth: "4",
        endYear: "2026",
        endMonth: "9",
      });
    });

    it("devolve o resumo do servidor", async () => {
      const summary = await DadosService.getExportSummary({ mode: "full" });

      expect(summary).toEqual({
        total: 3,
        revenues: 1,
        expenses: 2,
        periodStart: "2026-01",
        periodEnd: "2026-09",
      });
    });

    it("propaga o erro da API", async () => {
      mockApiError("get", "/data/export/summary", 400, { error: "EXPORT_PERIOD_TOO_LONG" });

      await expect(DadosService.getExportSummary({ mode: "full" })).rejects.toBeDefined();
    });
  });

  describe("downloadExport", () => {
    it("chama GET /data/export", async () => {
      const calls = recordRequests();

      await DadosService.downloadExport({ mode: "full" });

      expect(signatures(calls)).toEqual(["GET /data/export"]);
    });

    it("devolve o conteúdo do arquivo", async () => {
      const { blob } = await DadosService.downloadExport({ mode: "full" });

      expect(await blob.text()).toContain(CSV_HEADER);
    });

    it("usa o nome de arquivo que o servidor mandou", async () => {
      const { filename } = await DadosService.downloadExport({ mode: "full" });

      expect(filename).toBe("smaug-lancamentos-2026-09-14.csv");
    });
  });

  describe("previewImport", () => {
    it("chama POST /data/import/preview", async () => {
      const calls = recordRequests();

      await DadosService.previewImport(CSV_HEADER);

      expect(signatures(calls)).toEqual(["POST /data/import/preview"]);
    });

    it("manda o CSV cru como corpo", async () => {
      const calls = recordRequests();

      await DadosService.previewImport("competencia;natureza\r\n2026-04;receita");

      expect(await calls[0]!.text).toBe("competencia;natureza\r\n2026-04;receita");
    });

    it("declara o corpo como text/csv", async () => {
      const calls = recordRequests();

      await DadosService.previewImport(CSV_HEADER);

      expect(calls[0]!.headers.get("content-type")).toContain("text/csv");
    });

    it("devolve a prévia do servidor", async () => {
      const preview = await DadosService.previewImport(CSV_HEADER);

      expect(preview.validRows).toBe(2);
      expect(preview.counts.series).toBe(1);
    });
  });

  describe("runImport", () => {
    it("chama POST /data/import", async () => {
      const calls = recordRequests();

      await DadosService.runImport(CSV_HEADER);

      expect(signatures(calls)).toEqual(["POST /data/import"]);
    });

    it("devolve o relatório de criação", async () => {
      const result = await DadosService.runImport(CSV_HEADER);

      expect(result.total).toBe(2);
      expect(result.categoriesCreated).toBe(1);
    });

    it("propaga o erro da API", async () => {
      mockApiError("post", "/data/import", 422, { error: "IMPORT_NO_VALID_ROWS" });

      await expect(DadosService.runImport(CSV_HEADER)).rejects.toBeDefined();
    });
  });
});
