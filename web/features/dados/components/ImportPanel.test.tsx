import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { ImportPanel } from "./ImportPanel";
import { renderWithProviders } from "@/tests/render";
import { recordRequests, signatures } from "@/tests/requests";
import { mockApiError, server, url } from "@/tests/msw";

const CSV = "competencia;natureza;descricao;valor;tipo\r\n2026-04;receita;Salário;9200,00;fixa";

function renderPanel(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(<ImportPanel />, { pathname: "/dados", ...options });
}

async function uploadCsv(content = CSV) {
  const file = new File([content], "lancamentos.csv", { type: "text/csv" });
  await userEvent.upload(screen.getByLabelText("Arquivo CSV"), file);
  return file;
}

function previewWithErrors() {
  server.use(
    http.post(url("/data/import/preview"), () =>
      HttpResponse.json({
        validRows: 1,
        errors: [{ line: 3, code: "MISSING_CATEGORY" }],
        counts: { oneTime: 1, fixed: 0, installment: 0, recurring: 0, series: 0 },
      }),
    ),
  );
}

describe("ImportPanel: escolha do arquivo", () => {
  it("começa na área de soltar arquivo", () => {
    renderPanel();

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });

  it("avisa que a importação é sempre aditiva", () => {
    renderPanel();

    expect(screen.getByText(/cria registros novos/)).toBeInTheDocument();
    expect(
      screen.getByText(/importar o mesmo arquivo duas vezes gera tudo em dobro/),
    ).toBeInTheDocument();
  });

  it("manda o conteúdo do arquivo para conferência", async () => {
    renderPanel();
    const calls = recordRequests();

    await uploadCsv();

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import/preview"]));
    expect(await calls[0]!.text).toBe(CSV);
  });
});

describe("ImportPanel: conferência", () => {
  it("mostra o nome do arquivo escolhido", async () => {
    renderPanel();

    await uploadCsv();

    expect(await screen.findByText("lancamentos.csv")).toBeInTheDocument();
  });

  it("mostra quantos lançamentos vão entrar", async () => {
    renderPanel();

    await uploadCsv();

    expect(await screen.findByText("Vai entrar")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("quebra a contagem por tipo", async () => {
    renderPanel();

    await uploadCsv();

    expect(await screen.findByText("Avulsos")).toBeInTheDocument();
    expect(screen.getByText("Linhas de fixa")).toBeInTheDocument();
    expect(screen.getByText("Séries agrupadas")).toBeInTheDocument();
  });

  it("omite os tipos que não aparecem no arquivo", async () => {
    renderPanel();

    await uploadCsv();

    await screen.findByText("Vai entrar");
    expect(screen.queryByText("Linhas de parcela")).not.toBeInTheDocument();
  });

  it("lista as linhas recusadas com a mensagem em pt-BR", async () => {
    previewWithErrors();
    renderPanel();

    await uploadCsv();

    expect(await screen.findByText("linha 3")).toBeInTheDocument();
    expect(screen.getByText("Categoria obrigatória em despesas")).toBeInTheDocument();
  });

  it("avisa quando o arquivo não tem lançamento algum", async () => {
    server.use(
      http.post(url("/data/import/preview"), () =>
        HttpResponse.json({
          validRows: 0,
          errors: [],
          counts: { oneTime: 0, fixed: 0, installment: 0, recurring: 0, series: 0 },
        }),
      ),
    );
    renderPanel();

    await uploadCsv();

    expect(await screen.findByText("O arquivo não contém lançamentos.")).toBeInTheDocument();
  });

  it("não deixa importar um arquivo sem linhas válidas", async () => {
    server.use(
      http.post(url("/data/import/preview"), () =>
        HttpResponse.json({
          validRows: 0,
          errors: [],
          counts: { oneTime: 0, fixed: 0, installment: 0, recurring: 0, series: 0 },
        }),
      ),
    );
    renderPanel();

    await uploadCsv();

    await waitFor(() => expect(screen.getByRole("button", { name: /Importar 0/ })).toBeDisabled());
  });

  it("volta para a área de soltar ao cancelar", async () => {
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });

  it("volta para a área de soltar ao remover o arquivo", async () => {
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: "Remover arquivo" }));

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });

  it("mostra a mensagem da API quando o arquivo é ilegível", async () => {
    mockApiError("post", "/data/import/preview", 400, { error: "IMPORT_MISSING_COLUMNS" });
    renderPanel({ withToasts: true });

    await uploadCsv();

    expect(await screen.findByText(/ponto e vírgula/)).toBeInTheDocument();
  });

  it("permanece na área de soltar quando a conferência falha", async () => {
    mockApiError("post", "/data/import/preview", 500, {});
    renderPanel();

    await uploadCsv();

    await waitFor(() =>
      expect(
        screen.getByText("Arraste um arquivo CSV ou clique para escolher"),
      ).toBeInTheDocument(),
    );
  });
});

describe("ImportPanel: resultado", () => {
  it("importa o mesmo conteúdo que foi conferido", async () => {
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));

    await waitFor(() => expect(signatures(calls)).toEqual(["POST /data/import"]));
    expect(await calls[0]!.text).toBe(CSV);
  });

  it("mostra o resumo do que foi criado", async () => {
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));

    expect(await screen.findByRole("heading", { name: "2 registros criados" })).toBeInTheDocument();
    expect(screen.getByText("Categorias criadas")).toBeInTheDocument();
  });

  it("permite importar outro arquivo depois de concluir", async () => {
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");
    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));
    await screen.findByRole("heading", { name: "2 registros criados" });

    await userEvent.click(screen.getByRole("button", { name: "Importar outro arquivo" }));

    expect(screen.getByText("Arraste um arquivo CSV ou clique para escolher")).toBeInTheDocument();
  });

  it("continua na conferência quando a importação falha", async () => {
    mockApiError("post", "/data/import", 422, { error: "IMPORT_NO_VALID_ROWS" });
    renderPanel();
    await uploadCsv();
    await screen.findByText("Vai entrar");

    await userEvent.click(screen.getByRole("button", { name: /Importar 2 lançamentos/ }));

    await waitFor(() => expect(screen.getByText("Vai entrar")).toBeInTheDocument());
  });
});
