import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import DashboardPage from "@/app/(app)/dashboard/page";
import { renderWithProviders } from "../render";
import { server, url } from "../msw";
import {
  type ExpenseQueryPayload,
  type RevenueQueryPayload,
  makeExpenseQueryPayload,
  makeRevenueQueryPayload,
} from "../fixtures";
import { recordRequests } from "../requests";
import { freezeDateOnly, unfreezeTime } from "../time";

interface MonthStub {
  rev?: Partial<RevenueQueryPayload>;
  exp?: Partial<ExpenseQueryPayload>;
}

function stubMonths(byCompetence: Record<string, MonthStub> = {}) {
  const key = (request: Request) => {
    const q = new URL(request.url).searchParams;
    return `${q.get("competenceYear")}-${q.get("competenceMonth")}`;
  };

  server.use(
    http.get(url("/revenues"), ({ request }) =>
      HttpResponse.json(makeRevenueQueryPayload(byCompetence[key(request)]?.rev ?? {})),
    ),
    http.get(url("/expenses"), ({ request }) =>
      HttpResponse.json(makeExpenseQueryPayload(byCompetence[key(request)]?.exp ?? {})),
    ),
  );
}

const totals = (revenues: number, expenses: number): MonthStub => ({
  rev: { totals: { oneTimeTotal: revenues, fixedTotal: 0, total: revenues } },
  exp: { totals: { oneTime: expenses, installment: 0, recurring: 0, total: expenses } },
});

beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderPage() {
  return renderWithProviders(<DashboardPage />, { pathname: "/dashboard" });
}

/** Espera o fim do esqueleto de carregamento. */
const settled = () => screen.findByText("Setembro de 2026");

describe("dashboard: carregamento", () => {
  it("mostra esqueletos antes da resposta", () => {
    stubMonths();
    const { container } = renderPage();

    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("mostra o mês corrente com o badge de vigente", async () => {
    stubMonths();
    renderPage();

    expect(await settled()).toBeInTheDocument();
    expect(screen.getByText("Mês vigente")).toBeInTheDocument();
  });
});

describe("dashboard: KPIs", () => {
  it("exibe os três KPIs do mês corrente", async () => {
    stubMonths({ "2026-9": totals(5000, 3000) });
    renderPage();
    await settled();

    expect(screen.getByText("Total de receitas")).toBeInTheDocument();
    expect(screen.getByText("Total de despesas")).toBeInTheDocument();
    expect(screen.getByText("Saldo do mês")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?5\.000,00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/R\$\s?2\.000,00/)).toBeInTheDocument();
  });

  it('troca para "projetadas" em competência futura', async () => {
    stubMonths();
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));

    expect(await screen.findByText("Receitas projetadas")).toBeInTheDocument();
    expect(screen.getByText("Despesas projetadas")).toBeInTheDocument();
    // "Projeção" aparece duas vezes: badge do MonthNavigator e legenda do gráfico.
    expect(screen.getAllByText("Projeção")).toHaveLength(2);
  });

  it('mostra "Superávit" com saldo positivo ou zero', async () => {
    stubMonths({ "2026-9": totals(1000, 1000) });
    renderPage();
    await settled();

    expect(screen.getByText("Superávit")).toBeInTheDocument();
  });

  it('mostra "Déficit" com saldo negativo', async () => {
    stubMonths({ "2026-9": totals(1000, 2500) });
    renderPage();
    await settled();

    expect(screen.getByText("Déficit")).toBeInTheDocument();
    expect(screen.getByText(/^-R\$\s?1\.500,00$/)).toBeInTheDocument();
  });

  it.each([
    [0, "0 lançamentos"],
    [1, "1 lançamento"],
    [2, "2 lançamentos"],
  ])("pluraliza o sublabel com %i receitas", async (count, expected) => {
    stubMonths({
      "2026-9": {
        rev: {
          oneTimeRevenues: Array.from({ length: count }, (_, i) => ({
            id: `rev-${i}`,
            description: `Receita ${i}`,
            amount: 100,
          })),
        },
      },
    });
    renderPage();
    await settled();

    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });
});

describe("dashboard: gráfico semestral", () => {
  it("mostra seis meses centrados no mês corrente", async () => {
    stubMonths();
    renderPage();
    await settled();

    for (const label of ["Jun/26", "Jul/26", "Ago/26", "Set/26", "Out/26", "Nov/26"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("mescla os totais vindos de data.chart.months nas colunas", async () => {
    stubMonths({ "2026-6": totals(600, 60) });
    const { container } = renderPage();
    await settled();

    const junho = container.querySelector('[title^="Jun/26"]')!;
    expect(junho.getAttribute("title")).toMatch(/Receitas R\$.600,00 \| Despesas R\$.60,00/);
  });

  it("clicar numa coluna navega para aquele mês", async () => {
    stubMonths();
    const { container } = renderPage();
    await settled();

    await userEvent.click(container.querySelector('[title^="Jul/26"]')!);

    expect(await screen.findByText("Julho de 2026")).toBeInTheDocument();
    expect(screen.getByText("Passado")).toBeInTheDocument();
  });
});

describe("dashboard: navegação de mês", () => {
  it("dispara novo fetch ao trocar de competência (nova query key)", async () => {
    stubMonths();
    renderPage();
    await settled();
    const calls = recordRequests();

    await userEvent.click(screen.getByRole("button", { name: "Próximo mês" }));
    await screen.findByText("Outubro de 2026");

    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
  });

  it('"← Mês atual" volta para o mês corrente', async () => {
    stubMonths();
    renderPage();
    await settled();

    await userEvent.click(screen.getByRole("button", { name: "Mês anterior" }));
    await screen.findByText("Agosto de 2026");
    await userEvent.click(screen.getByRole("button", { name: "← Mês atual" }));

    expect(await settled()).toBeInTheDocument();
    expect(screen.getByText("Mês vigente")).toBeInTheDocument();
  });
});

describe("dashboard: tabelas de detalhe", () => {
  it("mostra os estados vazios das duas tabelas", async () => {
    stubMonths();
    renderPage();
    await settled();

    expect(screen.getByText("Nenhuma receita neste mês.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma despesa neste mês.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma despesa registrada neste mês.")).toBeInTheDocument();
  });

  it("lista as receitas com o badge de tipo e o total batendo com o KPI", async () => {
    stubMonths({
      "2026-9": {
        rev: {
          oneTimeRevenues: [{ id: "rev-1", description: "Freelance", amount: 1500 }],
          fixedRevenues: [
            {
              id: "fix-1",
              modality: "ALTERABLE",
              currentVersion: { description: "Salário", amount: 8000 },
            },
          ],
        },
      },
    });
    renderPage();
    await settled();

    expect(screen.getByText("Freelance")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText("Avulsa")).toBeInTheDocument();
    expect(screen.getByText("Fixa")).toBeInTheDocument();

    const totalRow = screen.getAllByText("Total")[0].closest("tr")!;
    expect(within(totalRow).getByText(/R\$\s?9\.500,00/)).toBeInTheDocument();
  });

  it("lista as despesas com categoria e total", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            {
              id: "exp-1",
              type: "RECURRING",
              description: "Aluguel",
              amount: 2200,
              category: { id: "cat-1", name: "Moradia" },
            },
          ],
        },
      },
    });
    renderPage();
    await settled();

    expect(screen.getByText("Aluguel")).toBeInTheDocument();
    expect(screen.getAllByText("Moradia").length).toBeGreaterThan(0);
    expect(screen.getByText("Recorrente")).toBeInTheDocument();
    expect(screen.getByText("100% das despesas")).toBeInTheDocument();
  });
});

describe("dashboard: resiliência", () => {
  it("renderiza com zeros quando a agregação falha (data undefined)", async () => {
    server.use(
      http.get(url("/revenues"), () => HttpResponse.json({}, { status: 500 })),
      http.get(url("/expenses"), () => HttpResponse.json({}, { status: 500 })),
    );
    renderPage();

    expect(await settled()).toBeInTheDocument();
    expect(screen.getByText("Nenhuma receita neste mês.")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma despesa neste mês.")).toBeInTheDocument();
    expect(screen.getByText("Superávit")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?0,00/).length).toBeGreaterThan(0);
  });
});
