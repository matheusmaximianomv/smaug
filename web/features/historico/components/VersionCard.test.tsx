import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { VersionHistoryEntry } from "../types";
import { VersionCard } from "./VersionCard";

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

describe("VersionCard: receita fixa", () => {
  it('rotula como "Receita Fixa" e prefixa o valor com +', () => {
    render(<VersionCard entry={entry({ type: "fixed-revenue", amount: 8000 })} />);

    expect(screen.getByText("Receita Fixa")).toBeInTheDocument();
    expect(screen.getByText(/^\+R\$\s?8\.000,00$/)).toBeInTheDocument();
  });

  it.each([
    ["ALTERABLE", "Alterável"],
    ["UNALTERABLE", "Inalterável"],
  ] as const)("exibe a modalidade %s como %s", (modality, label) => {
    render(<VersionCard entry={entry({ modality })} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("não exibe badge de modalidade quando ela é indefinida", () => {
    render(<VersionCard entry={entry({ modality: undefined })} />);

    expect(screen.queryByText("Alterável")).not.toBeInTheDocument();
    expect(screen.queryByText("Inalterável")).not.toBeInTheDocument();
  });

  it("ignora categoryName numa receita fixa", () => {
    render(<VersionCard entry={entry({ categoryName: "Moradia" })} />);

    expect(screen.queryByText("Moradia")).not.toBeInTheDocument();
  });
});

describe("VersionCard: despesa recorrente", () => {
  it('rotula como "Despesa Recorrente" e prefixa o valor com -', () => {
    render(<VersionCard entry={entry({ type: "recurring-expense", amount: 2200 })} />);

    expect(screen.getByText("Despesa Recorrente")).toBeInTheDocument();
    expect(screen.getByText(/^-R\$\s?2\.200,00$/)).toBeInTheDocument();
  });

  it("exibe a categoria quando há uma", () => {
    render(<VersionCard entry={entry({ type: "recurring-expense", categoryName: "Moradia" })} />);

    expect(screen.getByText("Moradia")).toBeInTheDocument();
  });

  it("não exibe badge de categoria quando ela é indefinida", () => {
    render(<VersionCard entry={entry({ type: "recurring-expense", categoryName: undefined })} />);

    expect(screen.getByText("Despesa Recorrente")).toBeInTheDocument();
    expect(screen.queryByText("Alterável")).not.toBeInTheDocument();
  });

  it("ignora modality numa despesa recorrente", () => {
    render(<VersionCard entry={entry({ type: "recurring-expense", modality: "ALTERABLE" })} />);

    expect(screen.queryByText("Alterável")).not.toBeInTheDocument();
  });
});

describe("VersionCard: comum", () => {
  it("exibe a descrição da versão", () => {
    render(<VersionCard entry={entry({ description: "Salário reajustado" })} />);

    expect(screen.getByText("Salário reajustado")).toBeInTheDocument();
  });

  it("indica que o valor é mensal", () => {
    render(<VersionCard entry={entry({})} />);

    expect(screen.getByText("/mês")).toBeInTheDocument();
  });
});
