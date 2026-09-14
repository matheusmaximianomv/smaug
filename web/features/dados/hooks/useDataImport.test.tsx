import { describe, it, expect } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { useDataImport } from "./useDataImport";
import { createTestQueryClient, renderHookWithProviders } from "@/tests/render";
import { spyOnToast } from "@/tests/toast";
import { recordRequests, signatures } from "@/tests/requests";
import { http, HttpResponse } from "msw";
import { mockApiError, server, url } from "@/tests/msw";
import { CSV_HEADER } from "@/tests/msw/handlers/data";

function setup() {
  const queryClient = createTestQueryClient();
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useDataImport(), { queryClient });
  return { ...rendered, queryClient, invalidateQueries, toast };
}

function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

describe("useDataImport: prévia", () => {
  it("envia o arquivo para conferência", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await act(async () => {
      await result.current.preview.mutateAsync(CSV_HEADER);
    });

    expect(signatures(calls)).toEqual(["POST /data/import/preview"]);
  });

  it("devolve a contagem do que vai entrar", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.preview.mutateAsync(CSV_HEADER);
    });

    expect(result.current.preview.data?.validRows).toBe(2);
  });

  it("não grava nada ao conferir", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await act(async () => {
      await result.current.preview.mutateAsync(CSV_HEADER);
    });

    expect(signatures(calls)).not.toContain("POST /data/import");
  });

  it("mostra a mensagem mapeada quando o arquivo não tem as colunas", async () => {
    mockApiError("post", "/data/import/preview", 400, { error: "IMPORT_MISSING_COLUMNS" });
    const { result, toast } = setup();

    await act(async () => {
      await result.current.preview.mutateAsync(CSV_HEADER).catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("ponto e vírgula"),
      expect.anything(),
    );
  });

  it("reenvia o mesmo arquivo ao tentar novamente", async () => {
    mockApiError("post", "/data/import/preview", 500, {});
    const { result, toast } = setup();

    await act(async () => {
      await result.current.preview.mutateAsync(CSV_HEADER).catch(() => {});
    });

    const calls = recordRequests();
    retryFromToast(toast);

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import/preview"]));
  });
});

describe("useDataImport: importação", () => {
  it("grava os lançamentos do arquivo", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER);
    });

    expect(signatures(calls)).toEqual(["POST /data/import"]);
  });

  it("invalida todo o cache, porque a importação toca várias áreas", async () => {
    const { result, invalidateQueries } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER);
    });

    expect(invalidateQueries).toHaveBeenCalledWith();
  });

  it("avisa quantos registros foram criados", async () => {
    const { result, toast } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER);
    });

    expect(toast.success).toHaveBeenCalledWith("2 registros criados com sucesso!");
  });

  it("usa o singular quando só um registro entrou", async () => {
    server.use(
      http.post(url("/data/import"), () =>
        HttpResponse.json(
          {
            total: 1,
            created: {
              oneTimeRevenues: 1,
              fixedRevenues: 0,
              oneTimeExpenses: 0,
              installmentExpenses: 0,
              recurringExpenses: 0,
            },
            categoriesCreated: 0,
          },
          { status: 201 },
        ),
      ),
    );
    const { result, toast } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER);
    });

    expect(toast.success).toHaveBeenCalledWith("1 registro criado com sucesso!");
  });

  it("mostra a mensagem mapeada quando nenhuma linha é válida", async () => {
    mockApiError("post", "/data/import", 422, { error: "IMPORT_NO_VALID_ROWS" });
    const { result, toast } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER).catch(() => {});
    });

    expect(toast.error).toHaveBeenCalledWith(
      "O arquivo não contém nenhum lançamento válido.",
      expect.anything(),
    );
  });

  it("não invalida o cache quando a importação falha", async () => {
    mockApiError("post", "/data/import", 500, {});
    const { result, invalidateQueries } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER).catch(() => {});
    });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("reenvia o mesmo arquivo ao tentar novamente", async () => {
    mockApiError("post", "/data/import", 500, {});
    const { result, toast } = setup();

    await act(async () => {
      await result.current.run.mutateAsync(CSV_HEADER).catch(() => {});
    });

    const calls = recordRequests();
    retryFromToast(toast);

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import"]));
  });
});
