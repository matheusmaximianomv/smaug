import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import DadosPage from "@/app/(app)/dados/page";
import { renderWithProviders } from "@/tests/render";
import { mockApiError, mockNetworkError, server, url } from "@/tests/msw";
import { freezeDateOnly, unfreezeTime } from "@/tests/time";
import { recordRequests, signatures } from "@/tests/requests";
import { spyOnToast } from "@/tests/toast";

const CSV = "competencia;natureza;descricao;valor;tipo\r\n2026-04;receita;Salário;9200,00;fixa";

/**
 * `useToast` guarda a fila em variável de módulo e o afterEach global só a esvazia sob timers
 * falsos, então toasts reais vazam entre os testes deste arquivo. Para a ação de retry o espião
 * é a forma recomendada pelo harness: assere a action sem depender da fila renderizada.
 */
function retryFromToast(toast: ReturnType<typeof spyOnToast>) {
  const [, options] = toast.error.mock.calls.at(-1)!;
  expect(options?.action?.label).toBe("Tentar novamente");
  act(() => {
    options!.action!.onClick();
  });
}

function renderPage(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<DadosPage />, { pathname: "/dados", ...options });
}

async function goToImport() {
  await userEvent.click(screen.getByRole("tab", { name: "Importar" }));
}

async function uploadCsv() {
  await userEvent.upload(
    screen.getByLabelText("Arquivo CSV"),
    new File([CSV], "lancamentos.csv", { type: "text/csv" }),
  );
}

describe("página Dados", () => {
  it("apresenta a área com as duas abas", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Dados" })).toBeInTheDocument();
    expect(screen.getByText("Exporte seus lançamentos ou traga dados de fora")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Exportar" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Importar" })).toBeInTheDocument();
  });

  it("abre na aba de exportação", async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText("Prévia")).toBeInTheDocument());
  });

  it("troca para a aba de importação", async () => {
    renderPage();

    await goToImport();

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });
});

describe("página Dados: erros da exportação", () => {
  // Congelado no describe inteiro: solto dentro do `it`, uma asserção que falhasse deixaria o
  // relógio falso para os testes seguintes do arquivo.
  beforeEach(() => freezeDateOnly());
  afterEach(() => unfreezeTime());

  it("mostra a mensagem de período longo recusado pela API", async () => {
    mockApiError("get", "/data/export", 400, { error: "EXPORT_PERIOD_TOO_LONG" });
    renderPage({ withToasts: true });
    await waitFor(() => expect(screen.getByText("Prévia")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Baixar CSV/ }));

    expect(await screen.findByText("O período selecionado passa de 12 meses.")).toBeInTheDocument();
  });

  it("oferece tentar novamente quando a exportação falha", async () => {
    mockApiError("get", "/data/export", 500, {});
    const toast = spyOnToast();
    renderPage();
    await waitFor(() => expect(screen.getByText("Prévia")).toBeInTheDocument());
    await userEvent.click(screen.getByRole("button", { name: /Baixar CSV/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    const calls = recordRequests();
    retryFromToast(toast);

    await waitFor(() => expect(signatures(calls)).toEqual(["GET /data/export"]));
  });

  it("mostra a mensagem de falha de rede", async () => {
    mockNetworkError("get", "/data/export");
    renderPage({ withToasts: true });
    await waitFor(() => expect(screen.getByText("Prévia")).toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: /Baixar CSV/ }));

    expect(
      await screen.findByText("Não foi possível falar com o servidor. Verifique sua conexão."),
    ).toBeInTheDocument();
  });
});

describe("página Dados: erros da importação", () => {
  it.each([
    ["IMPORT_EMPTY_FILE", 400, "O arquivo está vazio."],
    [
      "IMPORT_MISSING_COLUMNS",
      400,
      "O arquivo não tem as colunas obrigatórias. Verifique se o separador é ponto e vírgula.",
    ],
  ])("mostra a mensagem de %s", async (code, status, message) => {
    mockApiError("post", "/data/import/preview", status, { error: code });
    renderPage({ withToasts: true });
    await goToImport();

    await uploadCsv();

    expect(await screen.findByText(message)).toBeInTheDocument();
  });

  it("mostra a mensagem quando nenhuma linha é válida na gravação", async () => {
    mockApiError("post", "/data/import", 422, { error: "IMPORT_NO_VALID_ROWS" });
    renderPage({ withToasts: true });
    await goToImport();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));

    expect(
      await screen.findByText("O arquivo não contém nenhum lançamento válido."),
    ).toBeInTheDocument();
  });

  it("traduz cada código de linha recusada", async () => {
    server.use(
      http.post(url("/data/import/preview"), () =>
        HttpResponse.json({
          validRows: 0,
          errors: [
            { line: 2, code: "INVALID_COMPETENCE", value: "abril" },
            { line: 3, code: "MISSING_CATEGORY" },
            { line: 4, code: "REVENUE_TYPE_NOT_ALLOWED", value: "parcelada" },
            { line: 5, code: "INVALID_INSTALLMENT", value: "5/3" },
          ],
          counts: { oneTime: 0, fixed: 0, installment: 0, recurring: 0, series: 0 },
        }),
      ),
    );
    renderPage();
    await goToImport();

    await uploadCsv();

    expect(
      await screen.findByText('Competência "abril" inválida — esperado AAAA-MM'),
    ).toBeInTheDocument();
    expect(screen.getByText("Categoria obrigatória em despesas")).toBeInTheDocument();
    expect(screen.getByText("Receita não pode ser parcelada — use fixa")).toBeInTheDocument();
    expect(screen.getByText('Parcela "5/3" inválida')).toBeInTheDocument();
  });

  it("oferece tentar novamente quando a gravação falha", async () => {
    mockApiError("post", "/data/import", 500, {});
    const toast = spyOnToast();
    renderPage();
    await goToImport();
    await uploadCsv();
    await screen.findByText("Vai entrar");
    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());

    const calls = recordRequests();
    retryFromToast(toast);

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import"]));
  });
});

/**
 * Só a troca de tela entre as três etapas, que é comportamento de UI. O caminho feliz de ponta a
 * ponta — arquivo entra, registros nascem no banco — é do E2E (`e2e/tests/dados/importar.spec.ts`),
 * e repeti-lo aqui seria prova duplicada de algo que o MSW não consegue provar de verdade.
 */
describe("página Dados: etapas da importação", () => {
  it("troca a área de soltar pela conferência quando o arquivo é lido", async () => {
    renderPage();
    await goToImport();

    await uploadCsv();

    expect(await screen.findByText("lancamentos.csv")).toBeInTheDocument();
    expect(screen.getByText("Vai entrar")).toBeInTheDocument();
    expect(
      screen.queryByText("Arraste um arquivo CSV ou clique para escolher"),
    ).not.toBeInTheDocument();
  });

  it("troca a conferência pelo resumo quando a importação conclui", async () => {
    renderPage();
    await goToImport();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));

    expect(await screen.findByRole("heading", { name: "2 registros criados" })).toBeInTheDocument();
    expect(screen.queryByText("Vai entrar")).not.toBeInTheDocument();
  });
});
