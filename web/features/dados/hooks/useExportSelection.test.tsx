import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useExportSelection } from "./useExportSelection";
import { freezeDateOnly, unfreezeTime, NOW_COMPETENCE } from "@/tests/time";

/** Não toca na rede nem no cache: é estado de tela, então o `renderHook` cru basta. */
function setup() {
  return renderHook(() => useExportSelection());
}

describe("useExportSelection: recorte inicial", () => {
  beforeEach(() => freezeDateOnly());
  afterEach(() => unfreezeTime());

  it("começa no recorte por período", () => {
    const { result } = setup();
    expect(result.current.mode).toBe("period");
  });

  it("começa com a competência corrente nas duas pontas", () => {
    const { result } = setup();

    expect(result.current.start).toEqual(NOW_COMPETENCE);
    expect(result.current.end).toEqual(NOW_COMPETENCE);
  });

  it("monta os parâmetros do período escolhido", () => {
    const { result } = setup();

    expect(result.current.params).toEqual({
      mode: "period",
      startYear: NOW_COMPETENCE.year,
      startMonth: NOW_COMPETENCE.month,
      endYear: NOW_COMPETENCE.year,
      endMonth: NOW_COMPETENCE.month,
    });
  });

  it("reduz os parâmetros ao modo quando a base é completa", () => {
    const { result } = setup();

    act(() => result.current.setMode("full"));

    expect(result.current.params).toEqual({ mode: "full" });
  });
});

describe("useExportSelection: guarda do período", () => {
  beforeEach(() => freezeDateOnly());
  afterEach(() => unfreezeTime());

  it("aceita um recorte de um mês só", () => {
    const { result } = setup();
    expect(result.current.periodError).toBeUndefined();
  });

  it("aceita exatamente doze meses", () => {
    const { result } = setup();

    act(() => {
      result.current.setStart({ year: 2026, month: 1 });
      result.current.setEnd({ year: 2026, month: 12 });
    });

    expect(result.current.periodError).toBeUndefined();
  });

  it("recusa treze meses com a cópia do código da API", () => {
    const { result } = setup();

    act(() => {
      result.current.setStart({ year: 2026, month: 1 });
      result.current.setEnd({ year: 2027, month: 1 });
    });

    expect(result.current.periodError).toBe("O período selecionado passa de 12 meses.");
  });

  it("recusa um período invertido com a cópia do código da API", () => {
    const { result } = setup();

    act(() => {
      result.current.setStart({ year: 2026, month: 6 });
      result.current.setEnd({ year: 2026, month: 3 });
    });

    expect(result.current.periodError).toBe("O mês final é anterior ao inicial.");
  });

  it("não acusa período algum na base completa, que não tem recorte", () => {
    const { result } = setup();

    act(() => {
      result.current.setStart({ year: 2026, month: 6 });
      result.current.setEnd({ year: 2026, month: 3 });
      result.current.setMode("full");
    });

    expect(result.current.periodError).toBeUndefined();
  });
});
