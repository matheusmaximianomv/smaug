import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PreviewCard } from "./PreviewCard";

describe("PreviewCard", () => {
  it("mostra o título e a contagem", () => {
    render(<PreviewCard title="Prévia" count={12} countLabel="lançamentos" />);

    expect(screen.getByText("Prévia")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("lançamentos")).toBeInTheDocument();
  });

  it("lista os itens de meta como termo e definição", () => {
    render(
      <PreviewCard
        title="Prévia"
        count={1}
        countLabel="lançamento"
        meta={[{ label: "Receitas", value: 3 }]}
      />,
    );

    expect(screen.getByText("Receitas")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("omite a lista de meta quando não há itens", () => {
    const { container } = render(<PreviewCard title="Prévia" count={0} countLabel="lançamentos" />);

    expect(container.querySelector("dl")).toBeNull();
  });

  it("renderiza o rodapé quando informado", () => {
    render(
      <PreviewCard title="Prévia" count={0} countLabel="lançamentos" footer="UTF-8 · separador" />,
    );

    expect(screen.getByText("UTF-8 · separador")).toBeInTheDocument();
  });

  it("renderiza as ações passadas como filhos", () => {
    render(
      <PreviewCard title="Prévia" count={0} countLabel="lançamentos">
        <button>Baixar</button>
      </PreviewCard>,
    );

    expect(screen.getByRole("button", { name: "Baixar" })).toBeInTheDocument();
  });
});
