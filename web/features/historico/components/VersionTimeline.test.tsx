import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VersionHistoryEntry, VersionHistoryGroup } from "../types";
import { VersionTimeline } from "./VersionTimeline";

const entry = (o: Partial<VersionHistoryEntry>): VersionHistoryEntry => ({
  id: "v1",
  parentId: "p1",
  parentDescription: "Salário",
  type: "fixed-revenue",
  description: "Salário",
  amount: 8000,
  effectiveYear: 2026,
  effectiveMonth: 9,
  createdAt: "2026-01-01T00:00:00.000Z",
  ...o,
});

const group = (o: Partial<VersionHistoryGroup>): VersionHistoryGroup => ({
  year: 2026,
  month: 9,
  entries: [entry({})],
  ...o,
});

describe("VersionTimeline", () => {
  it("mostra o estado vazio sem grupos", () => {
    render(<VersionTimeline groups={[]} />);

    expect(screen.getByText("Nenhum histórico de versões encontrado.")).toBeInTheDocument();
  });

  it("usa o formato curto de mês/ano como cabeçalho do grupo", () => {
    render(<VersionTimeline groups={[group({ year: 2026, month: 9 })]} />);

    expect(screen.getByText("Set/26")).toBeInTheDocument();
  });

  it("renderiza um cabeçalho por grupo", () => {
    render(
      <VersionTimeline
        groups={[
          group({ year: 2026, month: 10, entries: [entry({ id: "a" })] }),
          group({ year: 2026, month: 9, entries: [entry({ id: "b" })] }),
        ]}
      />,
    );

    expect(screen.getByText("Out/26")).toBeInTheDocument();
    expect(screen.getByText("Set/26")).toBeInTheDocument();
  });

  it("renderiza uma entrada por versão do grupo", () => {
    render(
      <VersionTimeline
        groups={[
          group({
            entries: [
              entry({ id: "a", description: "Salário" }),
              entry({ id: "b", description: "Salário reajustado" }),
            ],
          }),
        ]}
      />,
    );

    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText("Salário reajustado")).toBeInTheDocument();
  });

  it("preserva a ordem dos grupos recebida", () => {
    render(
      <VersionTimeline
        groups={[
          group({ year: 2026, month: 11, entries: [entry({ id: "a" })] }),
          group({ year: 2025, month: 12, entries: [entry({ id: "b" })] }),
        ]}
      />,
    );

    const headers = screen.getAllByText(/\/\d{2}$/).map((el) => el.textContent);
    expect(headers).toEqual(["Nov/26", "Dez/25"]);
  });
});
