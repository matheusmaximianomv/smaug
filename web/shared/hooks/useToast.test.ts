import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { type Toast, toast, useToastState } from "./useToast";

/**
 * Este é um dos dois únicos arquivos que usam fake timers com o toast (o outro é
 * `Toast.test.tsx`): a fila e os listeners são variáveis de módulo sem reset, e a
 * expiração é um `setTimeout`. O `isolate` padrão do Vitest dá um registro de
 * módulos novo por arquivo, então o vazamento fica contido aqui.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  // Esvazia a fila antes do próximo teste do mesmo arquivo.
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

function subscribed() {
  const { result, unmount } = renderHook(() => {
    const state = useToastState();
    return state;
  });
  act(() => {
    result.current.subscribe();
  });
  return { result, unmount };
}

describe("toast.show", () => {
  it("enfileira o toast e notifica os assinantes", () => {
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "Salvo." });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({ type: "info", message: "Salvo." });
  });

  it("gera um id para cada toast", () => {
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "A" });
      toast.show({ type: "info", message: "B" });
    });

    const [a, b] = result.current.toasts;
    expect(a.id).toBeTruthy();
    expect(b.id).toBeTruthy();
    expect(a.id).not.toBe(b.id);
  });

  it("deriva o id de Math.random", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "A" });
    });

    expect(result.current.toasts[0].id).toBe((0.5).toString(36).slice(2));
  });

  it("remove o toast após 5000 ms por padrão", () => {
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "Salvo." });
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it("respeita uma duration custom", () => {
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "Rápido.", duration: 1000 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("expira múltiplos toasts de forma independente", () => {
    const { result } = subscribed();

    act(() => {
      toast.show({ type: "info", message: "Curto", duration: 1000 });
      toast.show({ type: "info", message: "Longo", duration: 5000 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts.map((t) => t.message)).toEqual(["Longo"]);

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe("atalhos por tipo", () => {
  it.each([
    ["success", "Categoria criada com sucesso!"],
    ["error", "Erro ao criar categoria."],
    ["info", "Sincronizando…"],
    ["warning", "Competência passada."],
  ] as const)("toast.%s define o type e a mensagem", (type, message) => {
    const { result } = subscribed();

    act(() => {
      toast[type](message);
    });

    expect(result.current.toasts[0]).toMatchObject({ type, message });
  });

  it("repassa a action para a fila", () => {
    const onClick = vi.fn();
    const { result } = subscribed();

    act(() => {
      toast.error("Erro ao criar categoria.", {
        action: { label: "Tentar novamente", onClick },
      });
    });

    const queued = result.current.toasts[0] as Toast;
    expect(queued.action?.label).toBe("Tentar novamente");
    queued.action?.onClick();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("repassa a duration para a fila", () => {
    const { result } = subscribed();

    act(() => {
      toast.success("Salvo!", { duration: 2000 });
    });

    expect(result.current.toasts[0].duration).toBe(2000);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});

describe("useToastState", () => {
  it("inicia com a fila corrente", () => {
    const first = subscribed();
    act(() => {
      toast.info("Já na fila");
    });

    const { result } = renderHook(() => useToastState());

    expect(result.current.toasts.map((t) => t.message)).toEqual(["Já na fila"]);
    first.unmount();
  });

  it("inicia vazio quando não há nada na fila", () => {
    const { result } = renderHook(() => useToastState());

    expect(result.current.toasts).toEqual([]);
  });

  it("não recebe notificações antes de subscribe()", () => {
    const { result } = renderHook(() => useToastState());

    act(() => {
      toast.info("Ignorado");
    });

    expect(result.current.toasts).toEqual([]);
  });

  it("o cleanup de subscribe() remove o listener", () => {
    const { result } = renderHook(() => useToastState());
    let unsubscribe: () => void = () => {};
    act(() => {
      unsubscribe = result.current.subscribe();
    });

    act(() => {
      toast.info("Antes");
    });
    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      unsubscribe();
    });
    act(() => {
      toast.info("Depois");
    });

    expect(result.current.toasts.map((t) => t.message)).toEqual(["Antes"]);
  });

  it("mantém subscribe estável entre renders", () => {
    const { result, rerender } = renderHook(() => useToastState());
    const first = result.current.subscribe;

    rerender();

    expect(result.current.subscribe).toBe(first);
  });
});
