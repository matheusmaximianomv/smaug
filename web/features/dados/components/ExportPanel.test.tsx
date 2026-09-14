import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportPanel } from "./ExportPanel";
import { renderWithProviders } from "@/tests/render";
import { recordRequests, signatures } from "@/tests/requests";
import { freezeDateOnly, unfreezeTime } from "@/tests/time";
import * as fileDownload from "@/infra/file-download";

function renderPanel() {
  return renderWithProviders(<ExportPanel />, { pathname: "/dados" });
}

const previewCount = () => screen.getByText("Prévia").parentElement!;

describe("ExportPanel", () => {
  beforeEach(() => {
    freezeDateOnly();
    vi.spyOn(fileDownload, "downloadBlob").mockImplementation(() => {});
    return () => unfreezeTime();
  });

  it("começa no recorte por período", () => {
    renderPanel();

    expect(screen.getByRole("radio", { name: "Período" })).toHaveAttribute("aria-checked", "true");
  });

  it("mostra a contagem da prévia vinda da API", async () => {
    renderPanel();

    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));
  });

  it("usa o singular quando só um lançamento entra no arquivo", async () => {
    const { server, url } = await import("@/tests/msw");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get(url("/data/export/summary"), () =>
        HttpResponse.json({
          total: 1,
          revenues: 1,
          expenses: 0,
          periodStart: "2026-09",
          periodEnd: "2026-09",
        }),
      ),
    );
    renderPanel();

    expect(await screen.findByText("lançamento")).toBeInTheDocument();
  });

  it("mostra quantas receitas e despesas entram no arquivo", async () => {
    renderPanel();

    await waitFor(() => expect(screen.getByText("Receitas")).toBeInTheDocument());
    expect(screen.getByText("Despesas")).toBeInTheDocument();
  });

  it("explica o grão mensal no modo período", () => {
    renderPanel();

    expect(
      screen.getByText("De 1 a 12 meses. O Smaug registra competência mensal, não dia."),
    ).toBeInTheDocument();
  });

  it("troca a explicação ao escolher a base completa", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Base completa" }));

    expect(screen.getByText(/Exporta tudo que existe, sem filtro/)).toBeInTheDocument();
    expect(screen.queryByLabelText("De — mês")).not.toBeInTheDocument();
  });

  it("consulta a base completa quando o recorte muda", async () => {
    renderPanel();
    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("radio", { name: "Base completa" }));

    await waitFor(() => expect(signatures(calls)).toEqual(["GET /data/export/summary"]));
    expect(calls[0]!.search.get("mode")).toBe("full");
  });

  it("acusa período invertido", async () => {
    renderPanel();
    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));

    await userEvent.selectOptions(screen.getByLabelText("Até — mês"), "3");

    expect(await screen.findByText("O mês final é anterior ao inicial.")).toBeInTheDocument();
  });

  it("não consulta a API enquanto o período está invertido", async () => {
    renderPanel();
    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));
    await userEvent.selectOptions(screen.getByLabelText("Até — mês"), "3");
    await screen.findByText("O mês final é anterior ao inicial.");

    const calls = recordRequests();
    await userEvent.selectOptions(screen.getByLabelText("De — mês"), "6");

    expect(signatures(calls)).toEqual([]);
  });

  it("consulta o novo recorte ao trocar o ano inicial", async () => {
    renderPanel();
    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));
    const calls = recordRequests();

    // 2025-12 até 2026-09 são 10 meses: atravessa a virada de ano e continua dentro do limite.
    await userEvent.selectOptions(screen.getByLabelText("De — ano"), "2025");
    await userEvent.selectOptions(screen.getByLabelText("De — mês"), "12");

    await waitFor(() => expect(signatures(calls)).toEqual(["GET /data/export/summary"]));
    expect(calls[0]!.search.get("startYear")).toBe("2025");
    expect(calls[0]!.search.get("startMonth")).toBe("12");
  });

  it("mostra o período resolvido da base completa", async () => {
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Base completa" }));

    await waitFor(() => expect(screen.getByText("Jan/26 – Set/26")).toBeInTheDocument());
  });

  it("mostra um traço enquanto a base completa não respondeu", async () => {
    const { mockPending } = await import("@/tests/msw");
    mockPending("get", "/data/export/summary");
    renderPanel();

    await userEvent.click(screen.getByRole("radio", { name: "Base completa" }));

    expect(await screen.findByText("— – —")).toBeInTheDocument();
  });

  it("acusa período maior que doze meses", async () => {
    renderPanel();

    await userEvent.selectOptions(screen.getByLabelText("De — mês"), "1");
    await userEvent.selectOptions(screen.getByLabelText("Até — mês"), "12");
    await userEvent.selectOptions(screen.getByLabelText("Até — ano"), "2027");

    expect(await screen.findByText(/O máximo é 12\./)).toBeInTheDocument();
  });

  it("desabilita o download enquanto o período está inválido", async () => {
    renderPanel();

    await userEvent.selectOptions(screen.getByLabelText("De — mês"), "6");
    await userEvent.selectOptions(screen.getByLabelText("Até — mês"), "3");

    await waitFor(() => expect(screen.getByRole("button", { name: /Baixar CSV/ })).toBeDisabled());
  });

  it("baixa o arquivo com o recorte escolhido", async () => {
    renderPanel();
    await waitFor(() => expect(previewCount()).toHaveTextContent("3"));
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: /Baixar CSV/ }));

    await waitFor(() => expect(signatures(calls)).toEqual(["GET /data/export"]));
    expect(fileDownload.downloadBlob).toHaveBeenCalled();
  });

  it("descreve o formato do arquivo para quem quiser conferir", () => {
    renderPanel();

    expect(screen.getByText("Formato do arquivo")).toBeInTheDocument();
    expect(screen.getByText(/UTF-8 · separador/)).toBeInTheDocument();
  });
});
