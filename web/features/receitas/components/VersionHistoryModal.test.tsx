import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeFixedRevenue, makeFixedRevenueVersion } from "../../../tests/fixtures";
import { VersionHistoryModal } from "./VersionHistoryModal";

describe("VersionHistoryModal", () => {
  it("não renderiza nada quando revenue é null", () => {
    const { container } = render(<VersionHistoryModal isOpen onClose={vi.fn()} revenue={null} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it('exibe o título "Histórico de versões"', () => {
    render(<VersionHistoryModal isOpen onClose={vi.fn()} revenue={makeFixedRevenue()} />);

    expect(screen.getByText("Histórico de versões")).toBeInTheDocument();
  });

  it("lista vazia quando versions vem undefined, sem quebrar", () => {
    render(<VersionHistoryModal isOpen onClose={vi.fn()} revenue={makeFixedRevenue()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByText(/A partir de/)).not.toBeInTheDocument();
  });

  it('exibe cada versão com "A partir de" e o valor mensal', () => {
    const version = makeFixedRevenueVersion({
      description: "Salário",
      amount: 8000,
      effectiveYear: 2026,
      effectiveMonth: 9,
    });
    render(
      <VersionHistoryModal
        isOpen
        onClose={vi.fn()}
        revenue={makeFixedRevenue({ currentVersion: version, versions: [version] })}
      />,
    );

    expect(screen.getByText("A partir de Set/26")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?8\.000,00\/mês/)).toBeInTheDocument();
  });

  it("ordena as versões em ordem decrescente de ano e mês", () => {
    const versions = [
      makeFixedRevenueVersion({ effectiveYear: 2025, effectiveMonth: 12 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 1 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 10 }),
      makeFixedRevenueVersion({ effectiveYear: 2026, effectiveMonth: 2 }),
    ];
    render(
      <VersionHistoryModal
        isOpen
        onClose={vi.fn()}
        revenue={makeFixedRevenue({ currentVersion: versions[0], versions })}
      />,
    );

    const labels = screen.getAllByText(/A partir de/).map((el) => el.textContent);
    expect(labels).toEqual([
      "A partir de Out/26",
      "A partir de Fev/26",
      "A partir de Jan/26",
      "A partir de Dez/25",
    ]);
  });

  it("não muta o array original de versões", () => {
    const versions = [
      makeFixedRevenueVersion({ effectiveMonth: 1 }),
      makeFixedRevenueVersion({ effectiveMonth: 10 }),
    ];
    const revenue = makeFixedRevenue({ currentVersion: versions[0], versions });

    render(<VersionHistoryModal isOpen onClose={vi.fn()} revenue={revenue} />);

    expect(revenue.versions?.map((v) => v.effectiveMonth)).toEqual([1, 10]);
  });
});
