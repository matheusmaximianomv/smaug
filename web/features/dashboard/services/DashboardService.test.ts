import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { mockApiError, server, url } from "../../../tests/msw";
import {
  type ExpenseQueryPayload,
  type RevenueQueryPayload,
  makeExpenseQueryPayload,
  makeRevenueQueryPayload,
} from "../../../tests/fixtures";
import { recordRequests } from "../../../tests/requests";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { DashboardService } from "./DashboardService";

/** Hoje, para todos os testes deste arquivo, salvo quando redefinido. */
const TODAY = new Date("2026-09-13T00:00:00Z");

interface MonthStub {
  rev?: Partial<RevenueQueryPayload>;
  exp?: Partial<ExpenseQueryPayload>;
}

/**
 * Devolve payloads por competência (`"2026-9"`). Meses não declarados vêm
 * vazios — o serviço precisa sobreviver a isso, já que busca 6 ou 7 meses.
 */
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

/** `["2026-6", "2026-6", "2026-7", …]` na ordem em que as requisições saíram. */
function competencesOf(calls: { search: URLSearchParams }[]): string[] {
  return calls.map((c) => `${c.search.get("competenceYear")}-${c.search.get("competenceMonth")}`);
}

beforeEach(() => {
  freezeDateOnly(TODAY);
});

afterEach(() => {
  unfreezeTime();
});

describe("janela de busca", () => {
  it("busca 6 meses (12 requisições) quando o mês selecionado está na janela", async () => {
    stubMonths();
    const calls = recordRequests();

    await DashboardService.getByMonth(2026, 9);

    expect(calls).toHaveLength(12);
    expect(new Set(competencesOf(calls))).toEqual(
      new Set(["2026-6", "2026-7", "2026-8", "2026-9", "2026-10", "2026-11"]),
    );
  });

  it("usa os offsets [-3,-2,-1,0,1,2] a partir do mês corrente", async () => {
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.chart.months.map((m) => `${m.year}-${m.month}`)).toEqual([
      "2026-6",
      "2026-7",
      "2026-8",
      "2026-9",
      "2026-10",
      "2026-11",
    ]);
  });

  it("busca 7 meses (14 requisições) quando o mês selecionado está fora da janela", async () => {
    stubMonths();
    const calls = recordRequests();

    await DashboardService.getByMonth(2026, 1);

    expect(calls).toHaveLength(14);
    expect(competencesOf(calls).slice(-2)).toEqual(["2026-1", "2026-1"]);
  });

  it("tira os KPIs do mês extra, não de um mês do gráfico, quando ele está fora da janela", async () => {
    stubMonths({
      "2026-1": {
        rev: { totals: { oneTimeTotal: 0, fixedTotal: 0, total: 4000 } },
        exp: { totals: { oneTime: 0, installment: 0, recurring: 0, total: 1000 } },
      },
      "2026-9": {
        rev: { totals: { oneTimeTotal: 0, fixedTotal: 0, total: 99999 } },
        exp: { totals: { oneTime: 0, installment: 0, recurring: 0, total: 99999 } },
      },
    });

    const data = await DashboardService.getByMonth(2026, 1);

    expect(data.kpis).toEqual({ totalRevenues: 4000, totalExpenses: 1000, balance: 3000 });
    expect(data.competence).toEqual({ year: 2026, month: 1 });
  });

  it("mantém o gráfico centrado em hoje mesmo com mês selecionado fora da janela", async () => {
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 1);

    expect(data.chart.months.map((m) => m.month)).toEqual([6, 7, 8, 9, 10, 11]);
  });

  it("faz o rollover de ano do gráfico quando hoje é janeiro", async () => {
    unfreezeTime();
    freezeDateOnly(new Date("2026-01-15T00:00:00Z"));
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 1);

    expect(data.chart.months.map((m) => `${m.year}-${m.month}`)).toEqual([
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-1",
      "2026-2",
      "2026-3",
    ]);
  });

  it("envia competenceYear e competenceMonth em toda requisição", async () => {
    stubMonths();
    const calls = recordRequests();

    await DashboardService.getByMonth(2026, 9);

    for (const call of calls) {
      expect(call.search.get("competenceYear")).toBeTruthy();
      expect(call.search.get("competenceMonth")).toBeTruthy();
    }
    expect(new Set(calls.map((c) => c.path))).toEqual(new Set(["/revenues", "/expenses"]));
  });
});

describe("recentRevenues", () => {
  it("mapeia as avulsas com type ONE_TIME", async () => {
    stubMonths({
      "2026-9": {
        rev: { oneTimeRevenues: [{ id: "rev-1", description: "Freelance", amount: 1500 }] },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentRevenues).toEqual([
      { id: "rev-1", type: "ONE_TIME", description: "Freelance", amount: 1500 },
    ]);
  });

  it("lê descrição e valor das fixas da currentVersion, com type FIXED", async () => {
    stubMonths({
      "2026-9": {
        rev: {
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

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentRevenues).toEqual([
      { id: "fix-1", type: "FIXED", description: "Salário", amount: 8000 },
    ]);
  });

  it("lista as avulsas antes das fixas", async () => {
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

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentRevenues.map((r) => r.type)).toEqual(["ONE_TIME", "FIXED"]);
  });

  it("devolve lista vazia quando não há receitas", async () => {
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentRevenues).toEqual([]);
  });
});

describe("recentExpenses", () => {
  it("preserva tipo, descrição, valor e nome da categoria", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            {
              id: "exp-1",
              type: "INSTALLMENT",
              description: "Notebook",
              amount: 300,
              category: { id: "cat-1", name: "Eletrônicos" },
            },
          ],
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentExpenses).toEqual([
      {
        id: "exp-1",
        type: "INSTALLMENT",
        description: "Notebook",
        amount: 300,
        categoryName: "Eletrônicos",
      },
    ]);
  });

  it("deixa categoryName undefined quando a despesa não tem categoria", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            {
              id: "exp-1",
              type: "ONE_TIME",
              description: "Avulsa",
              amount: 100,
              category: undefined as never,
            },
          ],
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.recentExpenses[0].categoryName).toBeUndefined();
  });
});

describe("breakdown", () => {
  const expense = (id: string, amount: number, category: { id: string; name: string } | null) => ({
    id,
    type: "ONE_TIME" as const,
    description: id,
    amount,
    category: category as { id: string; name: string },
  });

  it("agrupa despesas por id de categoria", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            expense("a", 100, { id: "cat-1", name: "Moradia" }),
            expense("b", 200, { id: "cat-2", name: "Alimentação" }),
          ],
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown.categories.map((c) => c.categoryId)).toEqual(["cat-1", "cat-2"]);
  });

  it("soma as despesas da mesma categoria", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            expense("a", 100, { id: "cat-1", name: "Moradia" }),
            expense("b", 50, { id: "cat-1", name: "Moradia" }),
          ],
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown.categories).toHaveLength(1);
    expect(data.breakdown.categories[0].amount).toBe(150);
  });

  it("calcula a porcentagem sobre o total de despesas", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [
            expense("a", 100, { id: "cat-1", name: "Moradia" }),
            expense("b", 300, { id: "cat-2", name: "Alimentação" }),
          ],
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown.categories.map((c) => c.percentage)).toEqual([25, 75]);
    expect(data.breakdown.total).toBe(400);
  });

  it("usa porcentagem 0 (e não NaN) quando o total de despesas é zero", async () => {
    stubMonths({
      "2026-9": {
        exp: {
          expenses: [expense("a", 0, { id: "cat-1", name: "Moradia" })],
          totals: { oneTime: 0, installment: 0, recurring: 0, total: 0 },
        },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown.categories[0].percentage).toBe(0);
    expect(data.breakdown.categories[0].percentage).not.toBeNaN();
  });

  it('agrupa despesa sem categoria em "sem-categoria" / "Sem categoria"', async () => {
    stubMonths({
      "2026-9": {
        exp: { expenses: [expense("a", 100, null)] },
      },
    });

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown.categories[0]).toMatchObject({
      categoryId: "sem-categoria",
      categoryName: "Sem categoria",
      amount: 100,
    });
  });

  it("devolve breakdown vazio quando não há despesas", async () => {
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.breakdown).toEqual({ categories: [], total: 0 });
  });
});

describe("kpis", () => {
  function stubTotals(revenues: number, expenses: number) {
    stubMonths({
      "2026-9": {
        rev: { totals: { oneTimeTotal: revenues, fixedTotal: 0, total: revenues } },
        exp: { totals: { oneTime: expenses, installment: 0, recurring: 0, total: expenses } },
      },
    });
  }

  it("calcula saldo positivo", async () => {
    stubTotals(5000, 3000);

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.kpis).toEqual({ totalRevenues: 5000, totalExpenses: 3000, balance: 2000 });
  });

  it("calcula saldo negativo", async () => {
    stubTotals(1000, 2500);

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.kpis.balance).toBe(-1500);
  });

  it("calcula saldo zero", async () => {
    stubTotals(2000, 2000);

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.kpis.balance).toBe(0);
  });
});

describe("status da competência", () => {
  it.each([
    [2026, 9, "current"],
    [2026, 8, "past"],
    [2026, 10, "future"],
    [2025, 12, "past"],
    [2027, 1, "future"],
  ])("competência %i-%i é %s", async (year, month, status) => {
    stubMonths();

    const data = await DashboardService.getByMonth(year, month);

    expect(data.status).toBe(status);
  });
});

describe("chart.months", () => {
  it("usa o resultado do índice do gráfico, não o do mês selecionado", async () => {
    stubMonths({
      "2026-6": {
        rev: { totals: { oneTimeTotal: 0, fixedTotal: 0, total: 600 } },
        exp: { totals: { oneTime: 0, installment: 0, recurring: 0, total: 60 } },
      },
      "2026-11": {
        rev: { totals: { oneTimeTotal: 0, fixedTotal: 0, total: 1100 } },
        exp: { totals: { oneTime: 0, installment: 0, recurring: 0, total: 110 } },
      },
      "2026-1": {
        rev: { totals: { oneTimeTotal: 0, fixedTotal: 0, total: 99999 } },
        exp: { totals: { oneTime: 0, installment: 0, recurring: 0, total: 99999 } },
      },
    });

    const data = await DashboardService.getByMonth(2026, 1);

    expect(data.chart.months[0]).toEqual({ year: 2026, month: 6, revenues: 600, expenses: 60 });
    expect(data.chart.months[5]).toEqual({ year: 2026, month: 11, revenues: 1100, expenses: 110 });
    expect(data.chart.months.map((m) => m.revenues)).not.toContain(99999);
  });

  it("zera os meses sem movimento", async () => {
    stubMonths();

    const data = await DashboardService.getByMonth(2026, 9);

    expect(data.chart.months.every((m) => m.revenues === 0 && m.expenses === 0)).toBe(true);
  });
});

describe("propagação de erro", () => {
  it("propaga a rejeição de qualquer uma das requisições do Promise.all", async () => {
    stubMonths();
    mockApiError("get", "/expenses", 500, {});

    await expect(DashboardService.getByMonth(2026, 9)).rejects.toMatchObject({
      response: { status: 500 },
    });
  });

  it("propaga a rejeição vinda de /revenues", async () => {
    stubMonths();
    mockApiError("get", "/revenues", 503, {});

    await expect(DashboardService.getByMonth(2026, 9)).rejects.toMatchObject({
      response: { status: 503 },
    });
  });
});
