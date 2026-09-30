import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ImportErrorList } from "./ImportErrorList";
import type { ImportRowError } from "../types";

const error = (line: number, code = "EMPTY_DESCRIPTION"): ImportRowError => ({ line, code });

describe("ImportErrorList", () => {
  it("não renderiza nada quando o arquivo está limpo", () => {
    const { container } = render(<ImportErrorList errors={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("usa o singular para uma única linha com problema", () => {
    render(<ImportErrorList errors={[error(2)]} />);

    expect(screen.getByText(/1 linha com problema — ela será ignorada/)).toBeInTheDocument();
  });

  it("usa o plural para várias linhas com problema", () => {
    render(<ImportErrorList errors={[error(2), error(3)]} />);

    expect(screen.getByText(/2 linhas com problema — elas serão ignoradas/)).toBeInTheDocument();
  });

  it("mostra o número da linha e a mensagem em pt-BR", () => {
    render(<ImportErrorList errors={[{ line: 7, code: "INVALID_COMPETENCE", value: "abril" }]} />);

    expect(screen.getByText("linha 7")).toBeInTheDocument();
    expect(screen.getByText('Competência "abril" inválida — esperado AAAA-MM')).toBeInTheDocument();
  });

  it("lista no máximo doze linhas", () => {
    const errors = Array.from({ length: 15 }, (_, index) => error(index + 2));

    render(<ImportErrorList errors={errors} />);

    expect(screen.getAllByText(/^linha /)).toHaveLength(12);
  });

  it("resume quantas linhas ficaram de fora da lista", () => {
    const errors = Array.from({ length: 15 }, (_, index) => error(index + 2));

    render(<ImportErrorList errors={errors} />);

    expect(screen.getByText("+ 3 outras")).toBeInTheDocument();
  });
});
