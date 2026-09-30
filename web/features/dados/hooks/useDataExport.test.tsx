import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { useDataExport } from "./useDataExport";
import { createTestQueryClient, renderHookWithProviders } from "@/tests/render";
import { spyOnToast } from "@/tests/toast";
import { recordRequests, signatures } from "@/tests/requests";
import { mockApiError } from "@/tests/msw";
import * as fileDownload from "@/infra/file-download";
import type { ExportParams } from "../types";

const PERIOD: ExportParams = {
  mode: "period",
  startYear: 2026,
  startMonth: 4,
  endYear: 2026,
  endMonth: 4,
};

function setup(params: ExportParams = PERIOD, enabled = true) {
  const queryClient = createTestQueryClient();
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useDataExport(params, enabled), { queryClient });
  return { ...rendered, queryClient, toast };
}

/** Dispara a action "Tentar novamente" do último toast de erro. */
function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useDataExport: prévia", () => {
  let downloadBlob: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    downloadBlob = vi.spyOn(fileDownload, "downloadBlob").mockImplementation(() => {});
  });

  it("usa a chave de cache com os parâmetros do recorte", async () => {
    const { queryClient, result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(
      queryClient.getQueryCache().find({ queryKey: ["data", "export-summary", PERIOD] }),
    ).toBeDefined();
  });

  it("mantém o resumo fresco por 30 segundos", async () => {
    const { queryClient, result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: ["data", "export-summary", PERIOD] });
    expect(query!.observers[0]!.options.staleTime).toBe(30_000);
  });

  it("busca o resumo do recorte", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(signatures(calls)).toEqual(["GET /data/export/summary"]);
    expect(result.current.data?.total).toBe(3);
  });

  it("não busca nada enquanto o período está inválido", async () => {
    const calls = recordRequests();
    const { result } = setup(PERIOD, false);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(signatures(calls)).toEqual([]);
  });

  it("expõe o estado de erro da prévia", async () => {
    mockApiError("get", "/data/export/summary", 400, { error: "EXPORT_PERIOD_TOO_LONG" });
    const { result } = setup();

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it("expõe a mutation de download", () => {
    const { result } = setup();

    expect(result.current.download).toBeDefined();
  });

  describe("download", () => {
    it("entrega o arquivo ao navegador", async () => {
      const { result } = setup();

      await act(async () => {
        await result.current.download.mutateAsync(PERIOD);
      });

      expect(downloadBlob).toHaveBeenCalledWith(
        "smaug-lancamentos-2026-09-14.csv",
        expect.any(Blob),
      );
    });

    it("avisa que o arquivo foi gerado", async () => {
      const { result, toast } = setup();

      await act(async () => {
        await result.current.download.mutateAsync(PERIOD);
      });

      expect(toast.success).toHaveBeenCalledWith("Arquivo gerado com sucesso!");
    });

    it("mostra a mensagem mapeada quando a API recusa o período", async () => {
      mockApiError("get", "/data/export", 400, { error: "EXPORT_PERIOD_TOO_LONG" });
      const { result, toast } = setup();

      await act(async () => {
        await result.current.download.mutateAsync(PERIOD).catch(() => {});
      });

      expect(toast.error).toHaveBeenCalledWith(
        "O período selecionado passa de 12 meses.",
        expect.anything(),
      );
    });

    it("não baixa nada quando a exportação falha", async () => {
      mockApiError("get", "/data/export", 500, {});
      const { result } = setup();

      await act(async () => {
        await result.current.download.mutateAsync(PERIOD).catch(() => {});
      });

      expect(downloadBlob).not.toHaveBeenCalled();
    });

    it("reenvia o mesmo recorte ao tentar novamente", async () => {
      mockApiError("get", "/data/export", 500, {});
      const { result, toast } = setup();

      await act(async () => {
        await result.current.download.mutateAsync(PERIOD).catch(() => {});
      });

      const calls = recordRequests();
      retryFromToast(toast);

      await waitFor(() => expect(signatures(calls)).toEqual(["GET /data/export"]));
    });
  });
});
