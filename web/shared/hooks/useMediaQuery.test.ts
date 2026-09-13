import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { setMatchMedia } from "../../vitest.setup";
import { useIsMobile, useMediaQuery } from "./useMediaQuery";

/**
 * O duplo padrão de `vitest.setup.ts` cria um MediaQueryList novo a cada chamada,
 * o que impede capturar o listener. Aqui trocamos por um duplo estável, com uma
 * lista de listeners real, para observar registro, remoção e disparo.
 */
function stubMatchMedia(initialMatches: boolean) {
  const listeners: (() => void)[] = [];
  const state = { matches: initialMatches, queries: [] as string[] };

  const media = {
    get matches() {
      return state.matches;
    },
    addEventListener: vi.fn((_: string, l: () => void) => listeners.push(l)),
    removeEventListener: vi.fn((_: string, l: () => void) => {
      const i = listeners.indexOf(l);
      if (i >= 0) listeners.splice(i, 1);
    }),
  };

  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    state.queries.push(query);
    return media as unknown as MediaQueryList;
  });

  return {
    media,
    listeners,
    queries: state.queries,
    emit(matches: boolean) {
      state.matches = matches;
      act(() => {
        listeners.forEach((l) => l());
      });
    },
  };
}

describe("useMediaQuery", () => {
  it("começa em false quando a media query não casa", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(false);
  });

  it("passa a true quando a media query casa no mount", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(true);
  });

  it("usa o duplo global do harness quando setMatchMedia(true) é chamado", () => {
    setMatchMedia(true);

    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(result.current).toBe(true);

    setMatchMedia(false);
  });

  it("reage ao evento change do MediaQueryList", () => {
    const stub = stubMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    stub.emit(true);

    expect(result.current).toBe(true);
  });

  it("registra o listener de change", () => {
    const stub = stubMatchMedia(false);

    renderHook(() => useMediaQuery("(max-width: 768px)"));

    expect(stub.media.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("remove o listener ao desmontar", () => {
    const stub = stubMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(max-width: 768px)"));

    unmount();

    expect(stub.media.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(stub.listeners).toHaveLength(0);
  });

  it("reconsulta quando a query muda", () => {
    const stub = stubMatchMedia(false);
    const { rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: "(max-width: 768px)" },
    });

    rerender({ query: "(min-width: 1024px)" });

    expect(stub.queries).toContain("(min-width: 1024px)");
  });
});

describe("useIsMobile", () => {
  it("consulta exatamente (max-width: 768px)", () => {
    const stub = stubMatchMedia(false);

    renderHook(() => useIsMobile());

    expect(stub.queries).toEqual(["(max-width: 768px)"]);
  });

  it("devolve true em viewport mobile", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });
});
