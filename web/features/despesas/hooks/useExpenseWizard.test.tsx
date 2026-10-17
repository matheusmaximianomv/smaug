import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import { bodyOf, recordRequests } from "../../../tests/requests";
import { spyOnToast } from "../../../tests/toast";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { makeOneTimeExpense } from "../../../tests/fixtures";
import { useExpenseWizard } from "./useExpenseWizard";
import type { OneTimeExpenseMonthItem } from "../types";

const SEP = { year: 2026, month: 9 };

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

function setup(options: { initial?: typeof SEP; edit?: OneTimeExpenseMonthItem } = {}) {
  spyOnToast();
  const onDone = vi.fn();
  const rendered = renderHookWithProviders(() =>
    useExpenseWizard({
      initialCompetence: options.initial ?? SEP,
      reference: SEP,
      edit: options.edit,
      onDone,
    }),
  );
  return { ...rendered, onDone };
}

async function fill(result: ReturnType<typeof setup>["result"], values: Record<string, unknown>) {
  act(() => {
    for (const [k, v] of Object.entries(values)) {
      result.current.form.setValue(k as never, v as never);
    }
  });
}

describe("useExpenseWizard: padrões", () => {
  it("abre na etapa Tipo com Avulsa e o mês selecionado na tela", () => {
    const { result } = setup({ initial: { year: 2026, month: 11 } });

    expect(result.current.step).toBe(0);
    expect(result.current.isEdit).toBe(false);
    expect(result.current.values).toMatchObject({
      kind: "avulsa",
      count: 2,
      hasEnd: false,
      start: { year: 2026, month: 11 },
      end: { year: 2027, month: 10 },
    });
    expect(result.current.minCompetence).toEqual(SEP);
  });

  it("usa o mês corrente quando a tela está num mês passado", () => {
    const { result } = setup({ initial: { year: 2026, month: 2 } });

    expect(result.current.values.start).toEqual(SEP);
  });

  it("troca de tipo preservando o que foi digitado", async () => {
    const { result } = setup();
    await fill(result, { description: "Notebook" });

    act(() => result.current.setKind("parcelada"));

    expect(result.current.values).toMatchObject({ kind: "parcelada", description: "Notebook" });
  });
});

describe("useExpenseWizard: etapas e validação", () => {
  it("não sai de Detalhes com campos inválidos e mostra as mensagens do PRD", async () => {
    const { result } = setup();
    await act(() => result.current.next());
    expect(result.current.step).toBe(1);

    await fill(result, { amount: "10,555" });
    await act(() => result.current.next());

    expect(result.current.step).toBe(1);
    expect(result.current.errors.amount?.message).toBe("Valor inválido");
    expect(result.current.errors.description?.message).toBe("Obrigatório");
    expect(result.current.errors.categoryId?.message).toBe("Selecione uma categoria");
  });

  it("vai à Revisão com dados válidos, volta e retorna à etapa Tipo pelo trocar", async () => {
    const { result } = setup();
    await act(() => result.current.next());
    await fill(result, { description: "Farmácia", amount: "50", categoryId: "cat" });

    await act(() => result.current.next());
    expect(result.current.step).toBe(2);
    await act(() => result.current.next());
    expect(result.current.step).toBe(2);

    act(() => result.current.back());
    expect(result.current.step).toBe(1);
    act(() => result.current.goToType());
    expect(result.current.step).toBe(0);
    act(() => result.current.back());
    expect(result.current.step).toBe(0);
  });

  it("calcula os meses afetados da parcelada com os centavos na 1ª", async () => {
    const { result } = setup();
    await fill(result, { kind: "parcelada", amount: "100", count: 3 });

    expect(result.current.affected.months.map((m) => m.amount)).toEqual([33.34, 33.33, 33.33]);
    expect(result.current.amount).toBe(100);
  });

  it("usa zero na prévia enquanto o valor é inválido e respeita o término", async () => {
    const { result } = setup();
    await fill(result, {
      kind: "recorrente",
      amount: "x",
      hasEnd: true,
      end: { year: 2026, month: 11 },
    });

    expect(result.current.amount).toBe(0);
    expect(result.current.affected.months).toHaveLength(3);
    expect(result.current.affected.open).toBe(false);
  });
});

describe("useExpenseWizard: edição", () => {
  const expense = makeOneTimeExpense({
    description: "Farmácia",
    amount: 89.9,
    competenceMonth: 10,
  });
  const item: OneTimeExpenseMonthItem = {
    ...expense,
    type: "ONE_TIME",
    category: { id: "cat-1", name: "Saúde" },
    categoryId: "cat-1",
  };

  it("abre direto em Detalhes, preenchido, e não volta para a etapa Tipo", () => {
    const { result } = setup({ edit: item });

    expect(result.current.step).toBe(1);
    expect(result.current.firstStep).toBe(1);
    expect(result.current.isEdit).toBe(true);
    expect(result.current.values).toMatchObject({
      description: "Farmácia",
      amount: "89,90",
      categoryId: "cat-1",
      start: { year: 2026, month: 10 },
    });

    act(() => result.current.back());
    expect(result.current.step).toBe(1);
  });

  it("salva com PUT e encerra o assistente", async () => {
    seedDb({ oneTimeExpenses: [expense] });
    const calls = recordRequests();
    const { result, onDone } = setup({ edit: item });
    await fill(result, { amount: "95" });

    act(() => result.current.submit());

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("updateOneTime"));
    expect(calls[0]).toMatchObject({ method: "PUT", path: `/expenses/one-time/${item.id}` });
    expect(await bodyOf(calls[0])).toEqual({
      description: "Farmácia",
      amount: 95,
      categoryId: "cat-1",
      competenceYear: 2026,
      competenceMonth: 10,
    });
  });
});

describe("useExpenseWizard: submit por tipo", () => {
  it.each([
    [
      { kind: "avulsa" },
      "/expenses/one-time",
      {
        description: "Compra",
        amount: 100,
        categoryId: "cat",
        competenceYear: 2026,
        competenceMonth: 9,
      },
    ],
    [
      { kind: "parcelada", count: 3 },
      "/expenses/installment",
      {
        description: "Compra",
        totalAmount: 100,
        installmentCount: 3,
        categoryId: "cat",
        startYear: 2026,
        startMonth: 9,
      },
    ],
    [
      { kind: "recorrente" },
      "/expenses/recurring",
      {
        description: "Compra",
        amount: 100,
        categoryId: "cat",
        startYear: 2026,
        startMonth: 9,
        endYear: null,
        endMonth: null,
      },
    ],
    [
      { kind: "recorrente", hasEnd: true, end: { year: 2027, month: 2 } },
      "/expenses/recurring",
      {
        description: "Compra",
        amount: 100,
        categoryId: "cat",
        startYear: 2026,
        startMonth: 9,
        endYear: 2027,
        endMonth: 2,
      },
    ],
  ])("envia %j para %s", async (extra, path, body) => {
    const calls = recordRequests();
    const { result, onDone } = setup();
    await fill(result, { description: " Compra ", amount: "100", categoryId: "cat", ...extra });

    act(() => result.current.submit());

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("create"));
    expect(calls[0]).toMatchObject({ method: "POST", path });
    expect(await bodyOf(calls[0])).toEqual(body);
  });
});
