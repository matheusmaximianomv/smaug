import { describe, it, expect, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { useImportFlow } from "./useImportFlow";
import { createTestQueryClient, renderHookWithProviders } from "@/tests/render";
import { spyOnToast } from "@/tests/toast";
import { recordRequests, signatures } from "@/tests/requests";
import { mockApiError, server, url } from "@/tests/msw";

const CSV = "competencia;natureza;descricao;valor;tipo\r\n2026-04;receita;Salário;9200,00;fixa";

function setup() {
  const queryClient = createTestQueryClient();
  const toast = spyOnToast();
  const rendered = renderHookWithProviders(() => useImportFlow(), { queryClient });
  return { ...rendered, queryClient, toast };
}

function csvFile(name = "lancamentos.csv"): File {
  return new File([CSV], name, { type: "text/csv" });
}

describe("useImportFlow: escolha do arquivo", () => {
  it("começa sem arquivo, prévia ou resultado", () => {
    const { result } = setup();

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("guarda o arquivo escolhido", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });

    expect(result.current.file?.name).toBe("lancamentos.csv");
  });

  it("manda o conteúdo do arquivo para conferência", async () => {
    const calls = recordRequests();
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import/preview"]));
    expect(await calls[0]!.text).toBe(CSV);
  });

  it("expõe a prévia devolvida pelo servidor", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });

    await waitFor(() => expect(result.current.preview?.validRows).toBe(2));
  });

  it("não deixa prévia quando a conferência falha", async () => {
    mockApiError("post", "/data/import/preview", 400, { error: "IMPORT_EMPTY_FILE" });
    const { result, toast } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(result.current.preview).toBeNull();
  });
});

describe("useImportFlow: gravação", () => {
  it("grava exatamente o conteúdo que foi conferido", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());

    const calls = recordRequests();
    act(() => result.current.confirm());

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import"]));
    expect(await calls[0]!.text).toBe(CSV);
  });

  it("expõe o relatório de criação", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.result?.total).toBe(2));
  });

  it("mantém a prévia quando a gravação falha", async () => {
    mockApiError("post", "/data/import", 422, { error: "IMPORT_NO_VALID_ROWS" });
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.result).toBeNull());
    expect(result.current.preview).not.toBeNull();
  });
});

describe("useImportFlow: recomeço", () => {
  it("limpa arquivo, prévia e resultado", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());

    act(() => result.current.reset());

    expect(result.current.file).toBeNull();
    expect(result.current.preview).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it("descarta o resultado anterior ao escolher outro arquivo", async () => {
    server.use(
      http.post(url("/data/import/preview"), () =>
        HttpResponse.json({
          validRows: 1,
          errors: [],
          counts: { oneTime: 1, fixed: 0, installment: 0, recurring: 0, series: 0 },
        }),
      ),
    );
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());
    act(() => result.current.confirm());
    await waitFor(() => expect(result.current.result).not.toBeNull());

    await act(async () => {
      await result.current.selectFile(csvFile("outro.csv"));
    });

    expect(result.current.result).toBeNull();
    expect(result.current.file?.name).toBe("outro.csv");
  });
});

describe("useImportFlow: estados de espera", () => {
  it("sinaliza a conferência em andamento", async () => {
    const { result } = setup();

    let release: () => void = () => {};
    server.use(
      http.post(url("/data/import/preview"), async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({
          validRows: 1,
          errors: [],
          counts: { oneTime: 1, fixed: 0, installment: 0, recurring: 0, series: 0 },
        });
      }),
    );

    await act(async () => {
      await result.current.selectFile(csvFile());
    });

    await waitFor(() => expect(result.current.isPreviewing).toBe(true));

    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.isPreviewing).toBe(false));
  });

  it("sinaliza a gravação em andamento", async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.selectFile(csvFile());
    });
    await waitFor(() => expect(result.current.preview).not.toBeNull());

    // A resposta fica presa até `release`: sem isso a gravação termina antes da asserção e o
    // estado intermediário nunca é observável.
    let release: () => void = () => {};
    server.use(
      http.post(url("/data/import"), async () => {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
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
        );
      }),
    );

    act(() => result.current.confirm());

    await waitFor(() => expect(result.current.isImporting).toBe(true));

    await act(async () => {
      release();
    });
    await waitFor(() => expect(result.current.isImporting).toBe(false));
  });
});
