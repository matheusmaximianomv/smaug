import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { useMonthNavigation } from "./useMonthNavigation";

afterEach(() => {
  unfreezeTime();
});

function setupAt(iso: string) {
  freezeDateOnly(new Date(iso));
  return renderHook(() => useMonthNavigation());
}

describe("useMonthNavigation", () => {
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
