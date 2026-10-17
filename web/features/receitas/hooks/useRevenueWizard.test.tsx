import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "../../../tests/render";
import { seedDb } from "../../../tests/msw";
import { bodyOf, recordRequests } from "../../../tests/requests";
import { spyOnToast } from "../../../tests/toast";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { makeOneTimeRevenue } from "../../../tests/fixtures";
import { useRevenueWizard } from "./useRevenueWizard";
import type { OneTimeRevenue } from "../types";

const SEP = { year: 2026, month: 9 };

beforeEach(() => freezeDateOnly());
afterEach(() => unfreezeTime());

function setup(options: { initial?: typeof SEP; edit?: OneTimeRevenue } = {}) {
  spyOnToast();
  const onDone = vi.fn();
  const rendered = renderHookWithProviders(() =>
    useRevenueWizard({
      initialCompetence: options.initial ?? SEP,
      reference: SEP,
      edit: options.edit,
      onDone,
    }),
  );
  return { ...rendered, onDone };
}

const fill = (result: ReturnType<typeof setup>["result"], values: Record<string, unknown>) =>
  act(() => {
    for (const [k, v] of Object.entries(values))
      result.current.form.setValue(k as never, v as never);
  });

describe("useRevenueWizard: padrões", () => {
  it("abre em Tipo com Avulsa; a fixa vem com término em início + 11 e Alterável", () => {
    const { result } = setup({ initial: { year: 2026, month: 5 } });

    expect(result.current.step).toBe(0);
    expect(result.current.values).toMatchObject({
      kind: "avulsa",
      start: SEP,
      hasEnd: true,
      end: { year: 2027, month: 8 },
      modality: "ALTERABLE",
    });
    act(() => result.current.setKind("fixa"));
    expect(result.current.values.kind).toBe("fixa");
  });

  it("mantém o mês selecionado quando é futuro", () => {
    const { result } = setup({ initial: { year: 2026, month: 12 } });

    expect(result.current.values.start).toEqual({ year: 2026, month: 12 });
  });
});

describe("useRevenueWizard: etapas", () => {
  it("valida em Detalhes, avança, volta e calcula os meses afetados", async () => {
    const { result } = setup();
    await act(() => result.current.next());
    await act(() => result.current.next());
    expect(result.current.step).toBe(1);
    expect(result.current.errors.description?.message).toBe("Obrigatório");

    fill(result, { kind: "fixa", description: "Salário", amount: "5.000", hasEnd: false });
    await act(() => result.current.next());
    expect(result.current.step).toBe(2);
    expect(result.current.affected).toMatchObject({ open: true });
    expect(result.current.amount).toBe(5000);

    act(() => result.current.back());
    act(() => result.current.goToType());
    expect(result.current.step).toBe(0);
    await act(() => result.current.next());
    await act(() => result.current.next());
    await act(() => result.current.next());
    expect(result.current.step).toBe(2);
  });

  it("usa zero na prévia com valor inválido", () => {
    const { result } = setup();
    fill(result, { amount: "abc" });

    expect(result.current.amount).toBe(0);
  });
});

describe("useRevenueWizard: submit", () => {
  it.each([
    [
      { kind: "avulsa" },
      "/revenues/one-time",
      { description: "Salário", amount: 100, competenceYear: 2026, competenceMonth: 9 },
    ],
    [
      { kind: "fixa" },
      "/revenues/fixed",
      {
        description: "Salário",
        amount: 100,
        modality: "ALTERABLE",
        startYear: 2026,
        startMonth: 9,
        endYear: 2027,
        endMonth: 8,
      },
    ],
    [
      { kind: "fixa", hasEnd: false, modality: "UNALTERABLE" },
      "/revenues/fixed",
      {
        description: "Salário",
        amount: 100,
        modality: "UNALTERABLE",
        startYear: 2026,
        startMonth: 9,
        endYear: null,
        endMonth: null,
      },
    ],
  ])("envia %j para %s", async (extra, path, body) => {
    const calls = recordRequests();
    const { result, onDone } = setup();
    fill(result, { description: " Salário ", amount: "100", ...extra });

    act(() => result.current.submit());

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("create"));
    expect(calls[0]).toMatchObject({ method: "POST", path });
    expect(await bodyOf(calls[0])).toEqual(body);
  });

  it("na edição abre em Detalhes preenchida e salva com PUT", async () => {
    const revenue = makeOneTimeRevenue({
      description: "Freelance",
      amount: 800,
      competenceMonth: 10,
    });
    seedDb({ oneTimeRevenues: [revenue] });
    const calls = recordRequests();
    const { result, onDone } = setup({ edit: revenue });

    expect(result.current.step).toBe(1);
    expect(result.current.isEdit).toBe(true);
    expect(result.current.values).toMatchObject({
      amount: "800,00",
      start: { year: 2026, month: 10 },
    });
    act(() => result.current.back());
    expect(result.current.step).toBe(1);

    act(() => result.current.submit());

    await waitFor(() => expect(onDone).toHaveBeenCalledWith("updateOneTime"));
    expect(calls[0]).toMatchObject({ method: "PUT", path: `/revenues/one-time/${revenue.id}` });
  });
});
