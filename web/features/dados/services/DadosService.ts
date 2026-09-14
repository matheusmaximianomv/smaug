import { apiClient } from "@/infra/api-client";
import { filenameFromContentDisposition } from "@/infra/file-download";
import type { ExportParams, ExportSummary, ImportPreview, ImportResult } from "../types";

/** Exportar e importar percorrem a base inteira; os 10s padrão do apiClient são curtos demais. */
const LONG_TIMEOUT_MS = 60_000;
const CSV_HEADERS = { "Content-Type": "text/csv" };
const FALLBACK_FILENAME = "smaug-lancamentos.csv";

export const DadosService = {
  getExportSummary: async (params: ExportParams): Promise<ExportSummary> => {
    const { data } = await apiClient.get("/data/export/summary", { params });
    return data;
  },

  downloadExport: async (params: ExportParams): Promise<{ filename: string; blob: Blob }> => {
    // `arraybuffer` e não `text`: o XHR remove o BOM ao decodificar texto, e o arquivo tem de
    // começar com ele para o Excel pt-BR ler os acentos. Aqui os bytes chegam como o servidor
    // mandou. Também não é `blob`, que o MSW não consegue responder no jsdom.
    const response = await apiClient.get("/data/export", {
      params,
      responseType: "arraybuffer",
      timeout: LONG_TIMEOUT_MS,
    });

    return {
      // O nome vem do servidor: a regra de nomeação do arquivo mora lá, não aqui.
      filename: filenameFromContentDisposition(
        response.headers["content-disposition"],
        FALLBACK_FILENAME,
      ),
      blob: new Blob([response.data], { type: "text/csv;charset=utf-8" }),
    };
  },

  previewImport: async (content: string): Promise<ImportPreview> => {
    const { data } = await apiClient.post("/data/import/preview", content, {
      headers: CSV_HEADERS,
      timeout: LONG_TIMEOUT_MS,
    });
    return data;
  },

  runImport: async (content: string): Promise<ImportResult> => {
    const { data } = await apiClient.post("/data/import", content, {
      headers: CSV_HEADERS,
      timeout: LONG_TIMEOUT_MS,
    });
    return data;
  },
};
