import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** `act` é necessário porque o setState acontece dentro do timer. */
function advance(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe("useDebounce", () => {
  it("devolve o valor inicial imediatamente", () => {
    const { result } = renderHook(() => useDebounce("mercado"));

    expect(result.current).toBe("mercado");
  });

  it("não atualiza antes de o delay terminar", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    advance(299);

    expect(result.current).toBe("a");
  });

  it("atualiza quando o delay termina", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    advance(300);

    expect(result.current).toBe("ab");
  });

  it("emite apenas o último valor de uma sequência rápida de mudanças", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "ab" });
    advance(100);
    rerender({ value: "abc" });
    advance(100);
    rerender({ value: "abcd" });
    advance(299);

    expect(result.current).toBe("a");

    advance(1);

    expect(result.current).toBe("abcd");
  });

  it("usa 500 ms como delay padrão", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    advance(499);
    expect(result.current).toBe("a");

    advance(1);
    expect(result.current).toBe("b");
  });

  it("respeita um delay custom maior", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 1000), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    advance(500);
    expect(result.current).toBe("a");

    advance(500);
    expect(result.current).toBe("b");
  });

  it("reinicia o timer quando o delay muda", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "a", delay: 300 },
    });

    rerender({ value: "b", delay: 1000 });
    advance(300);
    expect(result.current).toBe("a");

    advance(700);
    expect(result.current).toBe("b");
  });

  it("limpa o timer pendente ao desmontar", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");
    const { rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "a" },
    });

    rerender({ value: "b" });
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    expect(() => advance(300)).not.toThrow();
  });
});
