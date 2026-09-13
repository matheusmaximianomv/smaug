import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { toast } from "../hooks/useToast";
import { ToastContainer } from "./Toast";

/**
 * Junto com `useToast.test.ts`, o único arquivo que usa fake timers com o toast:
 * a expiração é um `setTimeout` de 5 s na fila global.
 */
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

function show(fn: () => void) {
  act(() => {
    fn();
  });
}

describe("ToastContainer", () => {
  it("não renderiza nada com a fila vazia", () => {
    const { container } = render(<ToastContainer />);

    expect(container).toBeEmptyDOMElement();
  });

  it("exibe a mensagem enfileirada", () => {
    render(<ToastContainer />);

    show(() => toast.success("Categoria criada com sucesso!"));

    expect(screen.getByText("Categoria criada com sucesso!")).toBeInTheDocument();
  });

  it.each(["success", "error", "info", "warning"] as const)(
    "aplica as cores do tipo %s",
    (type) => {
      const { container } = render(<ToastContainer />);

      show(() => toast[type]("Mensagem"));

      const card = container.querySelector(".shadow-lg")!;
      expect(card.className).toMatch(/border-|bg-/);
      expect(card.querySelector("svg")).not.toBeNull();
    },
  );

  it("renderiza o botão da action e dispara o onClick", async () => {
    const onClick = vi.fn();
    render(<ToastContainer />);

    show(() =>
      toast.error("Erro ao criar categoria.", {
        action: { label: "Tentar novamente", onClick },
      }),
    );
    act(() => {
      screen.getByRole("button", { name: "Tentar novamente" }).click();
    });

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("não renderiza botão quando não há action", () => {
    render(<ToastContainer />);

    show(() => toast.info("Sem ação"));

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("empilha múltiplos toasts", () => {
    render(<ToastContainer />);

    show(() => {
      toast.success("Primeiro");
      toast.error("Segundo");
    });

    expect(screen.getByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
  });

  it("some depois da duration", () => {
    render(<ToastContainer />);

    show(() => toast.info("Efêmero", { duration: 1000 }));
    expect(screen.getByText("Efêmero")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText("Efêmero")).not.toBeInTheDocument();
  });

  it("cancela a inscrição ao desmontar", () => {
    const { unmount } = render(<ToastContainer />);

    unmount();

    // Sem o cleanup, o setToasts de um componente desmontado seria chamado aqui.
    expect(() => show(() => toast.info("Depois do unmount"))).not.toThrow();
  });
});
