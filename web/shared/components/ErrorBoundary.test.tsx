import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * O React escreve o erro capturado no console; sem silenciar, a saída do teste
 * fica ilegível. `componentDidCatch` também loga por conta própria.
 */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

/** Lança na primeira renderização e depois se comporta. */
function Bomba({ explode }: { explode: boolean }) {
  if (explode) throw new Error("boom");
  return <p>Tudo certo</p>;
}

describe("ErrorBoundary", () => {
  it("renderiza os filhos quando não há erro", () => {
    render(
      <ErrorBoundary>
        <p>Conteúdo</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it('mostra "Algo deu errado." quando um filho lança', () => {
    render(
      <ErrorBoundary>
        <Bomba explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Algo deu errado.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("registra o erro no console", () => {
    render(
      <ErrorBoundary>
        <Bomba explode />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      "ErrorBoundary caught:",
      expect.any(Error),
      expect.anything(),
    );
  });

  it("usa o fallback custom quando informado", () => {
    render(
      <ErrorBoundary fallback={<p>Não foi possível carregar o histórico.</p>}>
        <Bomba explode />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Não foi possível carregar o histórico.")).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado.")).not.toBeInTheDocument();
  });

  it('"Tentar novamente" reseta o boundary e volta a renderizar os filhos', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomba explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo deu errado.")).toBeInTheDocument();

    // O filho precisa parar de lançar antes do reset, senão o boundary recaptura.
    rerender(
      <ErrorBoundary>
        <Bomba explode={false} />
      </ErrorBoundary>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(screen.getByText("Tudo certo")).toBeInTheDocument();
    expect(screen.queryByText("Algo deu errado.")).not.toBeInTheDocument();
  });
});
