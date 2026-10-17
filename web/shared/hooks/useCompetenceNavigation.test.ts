import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { freezeDateOnly, unfreezeTime } from "../../tests/time";
import {
  LEDGER_COMPETENCE_KEY,
  useCompetenceNavigation,
  useLedgerNavigation,
} from "./useCompetenceNavigation";

afterEach(() => {
  unfreezeTime();
  sessionStorage.clear();
});

function setupAt(iso: string) {
  freezeDateOnly(new Date(iso));
  return renderHook(() => useCompetenceNavigation());
}

describe("useCompetenceNavigation: navegação", () => {
  it("inicia no mês corrente", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.current).toEqual({ year: 2026, month: 9 });
    expect(result.current.status).toBe("current");
    expect(result.current.isCurrent).toBe(true);
  });

  it("navega para o próximo mês, que fica como futuro", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(1));

    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
    expect(result.current.status).toBe("future");
    expect(result.current.isCurrent).toBe(false);
  });

  it("navega para o mês anterior, que fica como passado", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(-1));

    expect(result.current.selected).toEqual({ year: 2026, month: 8 });
    expect(result.current.status).toBe("past");
    expect(result.current.isCurrent).toBe(false);
  });

  it("acumula a partir do mês selecionado, não do corrente", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(1));
    act(() => result.current.navigate(1));

    expect(result.current.selected).toEqual({ year: 2026, month: 11 });
  });

  it("acumula também para trás", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(-1));
    act(() => result.current.navigate(-1));
    act(() => result.current.navigate(-1));

    expect(result.current.selected).toEqual({ year: 2026, month: 6 });
  });

  it("goToCurrent volta ao mês corrente", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");
    act(() => result.current.navigate(3));

    act(() => result.current.goToCurrent());

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.isCurrent).toBe(true);
  });

  it("faz rollover de dezembro para janeiro do ano seguinte", () => {
    const { result } = setupAt("2026-12-05T00:00:00Z");

    act(() => result.current.navigate(1));

    expect(result.current.selected).toEqual({ year: 2027, month: 1 });
  });

  it("faz rollover de janeiro para dezembro do ano anterior", () => {
    const { result } = setupAt("2026-01-05T00:00:00Z");

    act(() => result.current.navigate(-1));

    expect(result.current.selected).toEqual({ year: 2025, month: 12 });
  });

  it("mantém current imutável durante a navegação", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(5));
    act(() => result.current.navigate(-9));

    expect(result.current.current).toEqual({ year: 2026, month: 9 });
    expect(result.current.selected).toEqual({ year: 2026, month: 5 });
    expect(result.current.status).toBe("past");
  });

  it("navigate(0) não move a seleção", () => {
    const { result } = setupAt("2026-09-13T00:00:00Z");

    act(() => result.current.navigate(0));

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.isCurrent).toBe(true);
  });
});

const KEY = "smaug:competencia-lancamentos";

describe("useCompetenceNavigation: persistência", () => {
  it("grava a seleção no sessionStorage quando há persistKey", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    const { result } = renderHook(() => useCompetenceNavigation({ persistKey: KEY }));

    act(() => result.current.navigate(2));

    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ year: 2026, month: 11 });
  });

  it("reabre no mês salvo", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    sessionStorage.setItem(KEY, JSON.stringify({ year: 2026, month: 7 }));

    const { result } = renderHook(() => useCompetenceNavigation({ persistKey: KEY }));

    expect(result.current.selected).toEqual({ year: 2026, month: 7 });
    expect(result.current.status).toBe("past");
  });

  it("select escolhe um mês arbitrário e o persiste", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    const { result } = renderHook(() => useCompetenceNavigation({ persistKey: KEY }));

    act(() => result.current.select({ year: 2027, month: 3 }));

    expect(result.current.selected).toEqual({ year: 2027, month: 3 });
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ year: 2027, month: 3 });
  });

  it("não lê nem grava o storage sem persistKey", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    sessionStorage.setItem(KEY, JSON.stringify({ year: 2026, month: 7 }));
    const { result } = renderHook(() => useCompetenceNavigation());

    act(() => result.current.navigate(1));

    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
    expect(JSON.parse(sessionStorage.getItem(KEY)!)).toEqual({ year: 2026, month: 7 });
  });

  it.each([
    ["JSON inválido", "{"],
    ["mês fora do intervalo", JSON.stringify({ year: 2026, month: 13 })],
    ["campos ausentes", JSON.stringify({ year: 2026 })],
    ["nulo", "null"],
    ["ano fracionário", JSON.stringify({ year: 2026.5, month: 3 })],
  ])("ignora valor salvo corrompido (%s)", (_, raw) => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    sessionStorage.setItem(KEY, raw);

    const { result } = renderHook(() => useCompetenceNavigation({ persistKey: KEY }));

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
  });

  it("abre no mês corrente e segue navegável quando o storage lança exceção", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() => useCompetenceNavigation({ persistKey: KEY }));
    expect(result.current.selected).toEqual({ year: 2026, month: 9 });

    act(() => result.current.navigate(1));
    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
  });
});

describe("useCompetenceNavigation: referência do servidor", () => {
  it("alinha a seleção à primeira reference quando não há valor salvo", () => {
    freezeDateOnly(new Date("2026-08-31T23:30:00Z"));
    const { result, rerender } = renderHook(
      ({ reference }) => useCompetenceNavigation({ persistKey: KEY, reference }),
      { initialProps: { reference: undefined as { year: number; month: number } | undefined } },
    );
    expect(result.current.selected).toEqual({ year: 2026, month: 8 });

    rerender({ reference: { year: 2026, month: 9 } });

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.current).toEqual({ year: 2026, month: 9 });
    expect(result.current.isCurrent).toBe(true);
  });

  it("não alinha quando há valor salvo", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    sessionStorage.setItem(KEY, JSON.stringify({ year: 2026, month: 7 }));

    const { result } = renderHook(() =>
      useCompetenceNavigation({ persistKey: KEY, reference: { year: 2026, month: 10 } }),
    );

    expect(result.current.selected).toEqual({ year: 2026, month: 7 });
    expect(result.current.current).toEqual({ year: 2026, month: 10 });
  });

  it("alinha uma única vez: referências seguintes não movem a seleção", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    const { result, rerender } = renderHook(
      ({ reference }) => useCompetenceNavigation({ reference }),
      { initialProps: { reference: { year: 2026, month: 9 } } },
    );

    rerender({ reference: { year: 2026, month: 10 } });

    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.status).toBe("past");
  });

  it("goToCurrent usa a reference do servidor", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    const { result } = renderHook(() =>
      useCompetenceNavigation({ reference: { year: 2026, month: 10 } }),
    );
    act(() => result.current.navigate(-3));

    act(() => result.current.goToCurrent());

    expect(result.current.selected).toEqual({ year: 2026, month: 10 });
  });
});

describe("useCompetenceNavigation: hidratação", () => {
  it("hidrata com o mês corrente e adota o valor salvo logo depois", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    sessionStorage.setItem(KEY, JSON.stringify({ year: 2026, month: 7 }));
    const seen: unknown[] = [];

    const { result } = renderHook(
      () => {
        const nav = useCompetenceNavigation({ persistKey: KEY });
        seen.push(nav.selected);
        return nav;
      },
      { hydrate: true },
    );

    expect(seen[0]).toEqual({ year: 2026, month: 9 });
    expect(result.current.selected).toEqual({ year: 2026, month: 7 });
  });
});

describe("useLedgerNavigation", () => {
  it("persiste na chave compartilhada e adota a referência do servidor uma vez", () => {
    freezeDateOnly(new Date("2026-08-31T23:30:00Z"));
    const { result } = renderHook(() => useLedgerNavigation());
    expect(result.current.selected).toEqual({ year: 2026, month: 8 });

    act(() => result.current.adoptReference({ year: 2026, month: 9 }));

    expect(result.current.reference).toEqual({ year: 2026, month: 9 });
    expect(result.current.selected).toEqual({ year: 2026, month: 9 });
    expect(result.current.isCurrent).toBe(true);

    act(() => result.current.navigate(1));
    expect(JSON.parse(sessionStorage.getItem(LEDGER_COMPETENCE_KEY)!)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it("ignora referência ausente ou igual à atual", () => {
    freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
    const { result } = renderHook(() => useLedgerNavigation());

    act(() => result.current.adoptReference(undefined));
    expect(result.current.reference).toBeUndefined();

    act(() => result.current.adoptReference({ year: 2026, month: 9 }));
    act(() => result.current.adoptReference({ year: 2026, month: 9 }));
    expect(result.current.reference).toEqual({ year: 2026, month: 9 });
  });
});
