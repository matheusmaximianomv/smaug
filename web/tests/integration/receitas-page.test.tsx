import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReceitasPage from "@/app/(app)/receitas/page";
import { renderWithProviders } from "../render";
import { db, mockApiError, seedDb } from "../msw";
import { makeFixedRevenue, makeFixedRevenueVersion, makeOneTimeRevenue } from "../fixtures";
import { recordRequests } from "../requests";
import { freezeDateOnly, unfreezeTime } from "../time";

const LEDGER_KEY = "smaug:competencia-lancamentos";

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T12:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
  sessionStorage.clear();
});

function renderPage() {
  return renderWithProviders(<ReceitasPage />, { pathname: "/receitas", withToasts: true });
}

const ficha = (name: string) => screen.getByRole("dialog", { name });
const settled = () => screen.findByRole("heading", { name: "Setembro 2026" });
const confirmIn = (name: string, button: string) =>
  userEvent.click(
    within(screen.getByRole("dialog", { name })).getByRole("button", { name: button }),
  );

function salary(o: { modality?: "ALTERABLE" | "UNALTERABLE"; endMonth?: number } = {}) {
  const version = makeFixedRevenueVersion({
    description: "Salário",
    amount: 5000,
    effectiveYear: 2026,
    effectiveMonth: 1,
  });
  return makeFixedRevenue({
    modality: o.modality ?? "ALTERABLE",
    startYear: 2026,
    startMonth: 1,
    endYear: o.endMonth ? 2026 : null,
    endMonth: o.endMonth ?? null,
    currentVersion: version,
    versions: [version],
  });
}

async function openSalary() {
  await userEvent.click(await screen.findByRole("button", { name: /Salário/ }));
  const dialog = await screen.findByRole("dialog", { name: "Salário" });
  await within(dialog).findByRole("tab", { name: "Linha do tempo" });
  return dialog;
}

describe("página de receitas: estrutura", () => {
  it("abre no mês corrente com o botão único e os grupos Fixas · Avulsas", async () => {
    seedDb({
      oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance" })],
      fixedRevenues: [salary()],
    });
    renderPage();
    await settled();

    expect(screen.getByRole("heading", { name: "Receitas", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Avulsas e fixas de cada mês")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Nova receita/ })).toHaveLength(1);
    const groups = await screen.findAllByRole("region", { name: /Fixas|Avulsas/ });
    expect(groups.map((g) => g.getAttribute("aria-label"))).toEqual(["Fixas", "Avulsas"]);
    expect(screen.getByText("Alterável · desde Jan/26 · sem término")).toBeInTheDocument();
    expect(screen.getByText("Total previsto")).toBeInTheDocument();
  });

  it('usa "Total recebido" em mês passado', async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ competenceMonth: 8 })] });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    expect(await screen.findByText("Total recebido")).toBeInTheDocument();
  });

  it("lê o mês persistido por Despesas (mesma chave de sessão)", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 7 }));
    renderPage();

    expect(await screen.findByRole("heading", { name: "Julho 2026" })).toBeInTheDocument();
  });
});

describe("página de receitas: estado vazio e erro", () => {
  it("em mês passado vazio não oferece botão", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 2 }));
    renderPage();

    expect(await screen.findByText("Nenhuma receita em fevereiro 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Adicionar receita" })).not.toBeInTheDocument();
  });

  it("em mês futuro vazio oferece adicionar receita", async () => {
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 12 }));
    renderPage();

    expect(
      await screen.findByText("Receitas fixas aparecem aqui automaticamente."),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar receita" }));
    expect(screen.getByRole("dialog", { name: "Nova receita" })).toBeInTheDocument();
  });

  it("mostra a mensagem pt-BR do erro e repete", async () => {
    mockApiError("get", "/revenues", 500, { error: "UNAUTHORIZED" });
    const calls = recordRequests();
    renderPage();

    expect(await screen.findByText("Sessão inválida. Faça login novamente.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    await waitFor(() => expect(calls.filter((c) => c.path === "/revenues")).toHaveLength(2));
  });
});

describe("página de receitas: assistente", () => {
  it("cria uma receita fixa inalterável com término padrão", async () => {
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova receita/ }));
    expect(
      screen.getByText("Essa receita entra uma vez ou durante um período?"),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("radio", { name: /Fixa \(com vigência\)/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByLabelText(/Fim da vigência/)).toHaveDisplayValue("Agosto 2027");
    expect(screen.getByRole("radio", { name: /pode mudar/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await userEvent.type(screen.getByLabelText("Descrição"), "Aluguel recebido");
    await userEvent.type(screen.getByLabelText(/Valor mensal/), "1200");
    await userEvent.click(screen.getByRole("radio", { name: /fica fixo/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(
      screen.getByText("Valor travado. Para mudar, encerre esta receita e crie outra."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Set\/26 a Ago\/27/)).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("Inalterável")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar receita" }));

    expect(await screen.findByText("Receita fixa criada")).toBeInTheDocument();
    expect(db.fixedRevenues[0]).toMatchObject({
      modality: "UNALTERABLE",
      endYear: 2027,
      endMonth: 8,
    });
  });

  it("revisa uma fixa alterável sem término e uma avulsa", async () => {
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova receita/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Fixa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Salário");
    await userEvent.type(screen.getByLabelText(/Valor mensal/), "5000");
    await userEvent.click(screen.getByRole("checkbox", { name: "Sem data de término" }));
    expect(screen.getByLabelText("Fim da vigência")).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(screen.getByText(/desde Set\/26, sem término/)).toBeInTheDocument();
    expect(
      screen.getByText(/Reajustes futuros serão registrados como nova versão/),
    ).toBeInTheDocument();
    expect(screen.getByText("continua…")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await userEvent.click(screen.getByRole("button", { name: "trocar" }));
    await userEvent.click(screen.getByRole("radio", { name: /Avulsa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByLabelText(/^Competência/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText(/em setembro 2026/, { selector: "small" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Confirmar receita" }));

    expect(await screen.findByText("Receita adicionada")).toBeInTheDocument();
  });

  it("valida o fim da vigência antes do início", async () => {
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova receita/ }));
    await userEvent.click(screen.getByRole("radio", { name: /Fixa/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Salário");
    await userEvent.type(screen.getByLabelText(/Valor mensal/), "5000");
    await userEvent.selectOptions(screen.getByLabelText(/Início da vigência/), "Dezembro 2027");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(await screen.findByText("Deve ser igual ou posterior ao início")).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText(/Fim da vigência/), "Março 2028");
    expect(screen.getByLabelText(/Fim da vigência/)).toHaveDisplayValue("Março 2028");
  });

  it("mantém o assistente aberto quando o servidor recusa", async () => {
    mockApiError("post", "/revenues/one-time", 409, { error: "PAST_COMPETENCE" });
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: /Nova receita/ }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.type(screen.getByLabelText("Descrição"), "Freelance");
    await userEvent.type(screen.getByLabelText(/^Valor/), "800");
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar receita" }));

    expect(
      await screen.findByText("Não é possível alterar lançamentos de competências passadas."),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Nova receita" })).toBeInTheDocument();
  });
});

describe("página de receitas: Ficha de avulsa", () => {
  it("avulsa passada não oferece Editar nem Remover", async () => {
    seedDb({
      oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance", competenceMonth: 8 })],
    });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Freelance/ }));

    expect(within(ficha("Freelance")).getByText("Recebida")).toBeInTheDocument();
    expect(within(ficha("Freelance")).queryByRole("button", { name: "Editar" })).toBeNull();
    expect(within(ficha("Freelance")).queryByRole("button", { name: "Remover" })).toBeNull();
  });

  it("edita e remove a avulsa do mês corrente", async () => {
    const revenue = makeOneTimeRevenue({ description: "Freelance", amount: 800 });
    seedDb({ oneTimeRevenues: [revenue] });
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Freelance/ }));
    expect(within(ficha("Freelance")).getByText("Prevista")).toBeInTheDocument();
    await userEvent.click(within(ficha("Freelance")).getByRole("button", { name: "Editar" }));
    expect(screen.getByText("O tipo não muda depois do cadastro.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));
    await userEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    expect(await screen.findByText("Receita atualizada")).toBeInTheDocument();

    await userEvent.click(await screen.findByRole("button", { name: /Freelance/ }));
    await userEvent.click(within(ficha("Freelance")).getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("dialog", { name: "Remover receita?" })).toHaveTextContent(
      'Tem certeza que deseja excluir a receita "Freelance"? Esta ação não pode ser desfeita.',
    );
    await confirmIn("Remover receita?", "Remover");
    expect(await screen.findByText("Receita removida")).toBeInTheDocument();
  });
});

describe("página de receitas: Ficha de fixa", () => {
  it("fixa inalterável não oferece Nova versão e mostra a nota", async () => {
    seedDb({ fixedRevenues: [salary({ modality: "UNALTERABLE" })] });
    renderPage();

    const dialog = await openSalary();

    expect(within(dialog).queryByRole("button", { name: "Nova versão" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: "Encerrar" })).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Receita inalterável: o valor fica igual até o encerramento. Por isso não há Nova versão.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Inalterável")).toBeInTheDocument();
  });

  it("fixa encerrada só consulta", async () => {
    seedDb({ fixedRevenues: [salary({ endMonth: 8 })] });
    sessionStorage.setItem(LEDGER_KEY, JSON.stringify({ year: 2026, month: 8 }));
    renderPage();

    const dialog = await openSalary();

    expect(
      within(dialog).getByText("Encerrada em Ago/26 — apenas consulta do histórico."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Encerrar" })).toBeNull();
    expect(within(dialog).getAllByRole("button", { name: "Fechar" })).toHaveLength(2);
  });

  it("cria nova versão: a Ficha recarrega a série e volta à visualização", async () => {
    seedDb({ fixedRevenues: [salary()] });
    renderPage();

    const dialog = await openSalary();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nova versão" }));
    expect(
      within(dialog).getByText(
        "A nova versão será aplicada a partir do mês selecionado. Meses anteriores preservam o valor antigo.",
      ),
    ).toBeInTheDocument();
    const amount = within(dialog).getByLabelText(/Novo valor mensal/);
    await userEvent.clear(amount);
    await userEvent.type(amount, "5500");
    await userEvent.selectOptions(
      within(dialog).getByLabelText(/Vigência a partir de/),
      "Novembro 2026",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));

    expect(await screen.findByText("Nova versão criada")).toBeInTheDocument();
    expect(
      await within(ficha("Salário")).findByRole("tab", { name: "Histórico (2)" }),
    ).toBeInTheDocument();
  });

  it("valida a vigência passada e mostra os erros pt-BR da API", async () => {
    const revenue = salary();
    seedDb({ fixedRevenues: [revenue] });
    renderPage();

    const dialog = await openSalary();
    await userEvent.click(within(dialog).getByRole("button", { name: "Nova versão" }));
    await userEvent.clear(within(dialog).getByLabelText("Nova descrição"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));
    expect(within(dialog).getByText("Obrigatório")).toBeInTheDocument();

    await userEvent.type(within(dialog).getByLabelText("Nova descrição"), "Salário");
    mockApiError("patch", `/revenues/fixed/${revenue.id}`, 422, { error: "UNALTERABLE_REVENUE" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Criar nova versão" }));
    expect(
      await screen.findByText("Esta receita é inalterável: só é possível encerrá-la."),
    ).toBeInTheDocument();
  });

  it("encerra a fixa", async () => {
    const revenue = salary();
    seedDb({ fixedRevenues: [revenue] });
    renderPage();

    const dialog = await openSalary();
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));
    expect(within(dialog).getByLabelText(/Mês de encerramento/)).toHaveDisplayValue(
      "Setembro 2026",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar receita" }));

    expect(await screen.findByText("Receita encerrada")).toBeInTheDocument();
    expect(db.fixedRevenues[0]).toMatchObject({ endYear: 2026, endMonth: 9 });
  });

  it("mostra o erro pt-BR do encerramento recusado", async () => {
    const revenue = salary();
    seedDb({ fixedRevenues: [revenue] });
    mockApiError("patch", `/revenues/fixed/${revenue.id}/terminate`, 409, {
      error: "ALREADY_EXPIRED",
    });
    renderPage();

    const dialog = await openSalary();
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Encerrar receita" }));

    expect(await screen.findByText("Este lançamento já está encerrado.")).toBeInTheDocument();
  });

  it("remove a fixa e fecha a Ficha", async () => {
    seedDb({ fixedRevenues: [salary()] });
    renderPage();

    const dialog = await openSalary();
    await userEvent.click(within(dialog).getByRole("button", { name: "Remover" }));
    expect(screen.getByRole("dialog", { name: "Remover receita?" })).toHaveTextContent(
      'Tem certeza que deseja excluir permanentemente a receita fixa "Salário"?',
    );
    await confirmIn("Remover receita?", "Remover");

    expect(await screen.findByText("Receita removida")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("mostra o erro de leitura da fixa e repete", async () => {
    const revenue = salary();
    seedDb({ fixedRevenues: [revenue] });
    mockApiError("get", `/revenues/fixed/${revenue.id}`, 404, { error: "FIXED_REVENUE_NOT_FOUND" });
    const calls = recordRequests();
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /Salário/ }));
    expect(
      await within(ficha("Salário")).findByText("Receita fixa não encontrada."),
    ).toBeInTheDocument();
    await userEvent.click(
      within(ficha("Salário")).getByRole("button", { name: "Tentar novamente" }),
    );

    await waitFor(() =>
      expect(calls.filter((c) => c.path === `/revenues/fixed/${revenue.id}`)).toHaveLength(2),
    );
  });
});
