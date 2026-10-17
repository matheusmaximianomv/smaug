import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { mockApiError, seedDb } from "../../../tests/msw";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeOneTimeRevenue,
} from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useRevenueMonth } from "./useRevenueMonth";
import { useRevenueYearSummary } from "./useRevenueYearSummary";

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

const setup = (month = 9) => renderHookWithProviders(() => useRevenueMonth({ year: 2026, month }));

describe("useRevenueMonth: grupos e linhas", () => {
  it("ordena Fixas · Avulsas, monta subtítulos e o selo de reajuste", async () => {
    const v1 = makeFixedRevenueVersion({ amount: 5000, effectiveYear: 2026, effectiveMonth: 3 });
    const v2 = makeFixedRevenueVersion({ amount: 5500, effectiveYear: 2026, effectiveMonth: 9 });
    seedDb({
      oneTimeRevenues: [makeOneTimeRevenue({ description: "Freelance", amount: 800 })],
      fixedRevenues: [
        makeFixedRevenue({
          startYear: 2026,
          startMonth: 3,
          currentVersion: v2,
          versions: [v1, v2],
        }),
        makeFixedRevenue({
          modality: "UNALTERABLE",
          startYear: 2026,
          startMonth: 3,
          endYear: 2026,
          endMonth: 12,
          currentVersion: makeFixedRevenueVersion({
            description: "Aluguel",
            effectiveYear: 2026,
            effectiveMonth: 3,
          }),
        }),
      ],
    });
    const { result, queryClient } = setup();

    await waitFor(() => expect(result.current.ledger).toBeDefined());
    const ledger = result.current.ledger!;

    expect(queryClient.getQueryData(["revenues", "month", 2026, 9])).toBeDefined();
    expect(ledger.groups.map((g) => g.title)).toEqual(["Fixas", "Avulsas"]);
    const [salary, rent] = ledger.groups[0].rows;
    expect(salary).toMatchObject({
      title: "Salário",
      subtitle: ["Alterável", "desde Mar/26", "sem término"],
      previousAmount: 5000,
      amountCaption: "por mês",
    });
    expect(rent.subtitle).toEqual(["Inalterável", "desde Mar/26", "até Dez/26"]);
    expect(ledger.groups[1].rows[0]).toMatchObject({
      title: "Freelance",
      subtitle: [],
      previousAmount: null,
    });
    expect(ledger.totalLabel).toBe("Total previsto");
    expect(ledger.segments.map((s) => s.label)).toEqual(["Fixas", "Avulsas"]);
    expect(ledger.count).toBe(3);
  });

  it('rotula mês passado como "Total recebido"', async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ competenceMonth: 8 })] });
    const { result } = setup(8);

    await waitFor(() => expect(result.current.ledger).toBeDefined());

    expect(result.current.ledger!.totalLabel).toBe("Total recebido");
  });

  it("expõe a mensagem pt-BR do erro", async () => {
    mockApiError("get", "/revenues", 500, {});
    const { result } = setup();

    await waitFor(() => expect(result.current.errorMessage).toBe("Erro ao carregar receitas."));
  });
});

describe("useRevenueYearSummary: células da faixa", () => {
  it("devolve o total de cada mês, nulo sem lançamento", async () => {
    seedDb({ oneTimeRevenues: [makeOneTimeRevenue({ competenceMonth: 2, amount: 800 })] });
    const { result, queryClient } = renderHookWithProviders(() => useRevenueYearSummary(2026));

    expect(result.current.totals).toEqual([]);
    await waitFor(() => expect(result.current.totals).toHaveLength(12));

    expect(result.current.totals[1]).toBe(800);
    expect(result.current.totals[0]).toBeNull();
    expect(queryClient.getQueryData(["revenues", "summary", 2026])).toBeDefined();
  });
});
