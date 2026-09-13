import { describe, expect, it } from "vitest";
import { mockApiError, seedDb } from "../../../tests/msw";
import {
  makeFixedRevenue,
  makeFixedRevenueVersion,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../../tests/fixtures";
import { recordRequests, signatures } from "../../../tests/requests";
import { HistoricoService } from "./HistoricoService";

/**
 * `toEntries` e `groupByMonth` continuam privados de propósito: todos os ramos
 * são alcançáveis por `getGroups()` escolhendo as fixtures certas.
 */

describe("HistoricoService.getGroups", () => {
  it("busca receitas fixas e despesas recorrentes em paralelo", async () => {
    const calls = recordRequests();

    await HistoricoService.getGroups();

    expect(signatures(calls).sort()).toEqual(["GET /expenses/recurring", "GET /revenues/fixed"]);
  });

  it("devolve lista vazia quando não há lançamentos versionados", async () => {
    await expect(HistoricoService.getGroups()).resolves.toEqual([]);
  });

  it("achata as versões das receitas fixas", async () => {
    const v1 = makeFixedRevenueVersion({ amount: 8000, effectiveYear: 2026, effectiveMonth: 9 });
    const v2 = makeFixedRevenueVersion({ amount: 9000, effectiveYear: 2026, effectiveMonth: 10 });
    seedDb({ fixedRevenues: [makeFixedRevenue({ currentVersion: v2, versions: [v1, v2] })] });

    const groups = await HistoricoService.getGroups();

    expect(groups.flatMap((g) => g.entries).map((e) => e.amount)).toEqual([9000, 8000]);
  });

  it("achata as versões das despesas recorrentes", async () => {
    const v1 = makeRecurringExpenseVersion({ amount: 2200, effectiveMonth: 9 });
    const v2 = makeRecurringExpenseVersion({ amount: 2500, effectiveMonth: 10 });
    seedDb({
      recurringExpenses: [makeRecurringExpense({ currentVersion: v2, versions: [v1, v2] })],
    });

    const groups = await HistoricoService.getGroups();

    expect(groups.flatMap((g) => g.entries)).toHaveLength(2);
  });

  it("não estoura quando versions vem undefined", async () => {
    // makeFixedRevenue/makeRecurringExpense deixam `versions` undefined de propósito.
    seedDb({
      fixedRevenues: [makeFixedRevenue()],
      recurringExpenses: [makeRecurringExpense()],
    });

    await expect(HistoricoService.getGroups()).resolves.toEqual([]);
  });

  it("tagueia cada entrada com o seu type", async () => {
    const rv = makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    const ev = makeRecurringExpenseVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    seedDb({
      fixedRevenues: [makeFixedRevenue({ currentVersion: rv, versions: [rv] })],
      recurringExpenses: [makeRecurringExpense({ currentVersion: ev, versions: [ev] })],
    });

    const entries = (await HistoricoService.getGroups()).flatMap((g) => g.entries);

    expect(entries.map((e) => e.type)).toEqual(["fixed-revenue", "recurring-expense"]);
  });

  it("receita fixa carrega modality e não carrega categoryName", async () => {
    const v = makeFixedRevenueVersion();
    seedDb({
      fixedRevenues: [
        makeFixedRevenue({ modality: "UNALTERABLE", currentVersion: v, versions: [v] }),
      ],
    });

    const [entry] = (await HistoricoService.getGroups()).flatMap((g) => g.entries);

    expect(entry.modality).toBe("UNALTERABLE");
    expect(entry.categoryName).toBeUndefined();
  });

  it("despesa recorrente carrega categoryName vindo da categoria da versão", async () => {
    const v = makeRecurringExpenseVersion();
    seedDb({ recurringExpenses: [makeRecurringExpense({ currentVersion: v, versions: [v] })] });

    const [entry] = (await HistoricoService.getGroups()).flatMap((g) => g.entries);

    expect(entry.categoryName).toBe("Moradia");
    expect(entry.modality).toBeUndefined();
  });

  it("categoryName fica undefined quando a versão não tem categoria", async () => {
    const v = makeRecurringExpenseVersion();
    const semCategoria = { ...v, category: undefined as never };
    seedDb({
      recurringExpenses: [makeRecurringExpense({ currentVersion: v, versions: [semCategoria] })],
    });

    const [entry] = (await HistoricoService.getGroups()).flatMap((g) => g.entries);

    expect(entry.categoryName).toBeUndefined();
  });

  it("parentId aponta para o lançamento e parentDescription vem da versão", async () => {
    const v1 = makeFixedRevenueVersion({ description: "Salário", effectiveMonth: 9 });
    const v2 = makeFixedRevenueVersion({ description: "Salário reajustado", effectiveMonth: 10 });
    const revenue = makeFixedRevenue({ currentVersion: v2, versions: [v1, v2] });
    seedDb({ fixedRevenues: [revenue] });

    const entries = (await HistoricoService.getGroups()).flatMap((g) => g.entries);

    expect(entries.every((e) => e.parentId === revenue.id)).toBe(true);
    expect(entries.map((e) => e.parentDescription)).toEqual(["Salário reajustado", "Salário"]);
  });

  it("agrupa por mês com padding: 2026-9 e 2026-09 caem no mesmo grupo", async () => {
    const rv = makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    const ev = makeRecurringExpenseVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    seedDb({
      fixedRevenues: [makeFixedRevenue({ currentVersion: rv, versions: [rv] })],
      recurringExpenses: [makeRecurringExpense({ currentVersion: ev, versions: [ev] })],
    });

    const groups = await HistoricoService.getGroups();

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ year: 2026, month: 9 });
    expect(groups[0].entries).toHaveLength(2);
  });

  it("ordena os grupos em ordem decrescente de ano e depois de mês", async () => {
    const versions = [
      makeFixedRevenueVersion({ effectiveYear: 2025, effectiveMonth: 12 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 1 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 11 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 2 }),
    ];
    seedDb({ fixedRevenues: [makeFixedRevenue({ currentVersion: versions[0], versions })] });

    const groups = await HistoricoService.getGroups();

    expect(groups.map((g) => `${g.year}-${g.month}`)).toEqual([
      "2026-11",
      "2026-2",
      "2026-1",
      "2025-12",
    ]);
  });

  it("mantém ano e mês como números depois do split da chave", async () => {
    const v = makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 3 });
    seedDb({ fixedRevenues: [makeFixedRevenue({ currentVersion: v, versions: [v] })] });

    const [group] = await HistoricoService.getGroups();

    expect(group.year).toBe(2026);
    expect(group.month).toBe(3);
  });

  it("propaga erro de qualquer uma das duas requisições", async () => {
    mockApiError("get", "/expenses/recurring", 500, {});

    await expect(HistoricoService.getGroups()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});
