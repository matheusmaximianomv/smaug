import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeFixedRevenue, makeFixedRevenueVersion } from "../../../tests/fixtures";
import type { FixedRevenue } from "../types";
import { FixedRevenueCard } from "./FixedRevenueCard";

const HANDLERS = () => ({
  onAddVersion: vi.fn(),
  onTerminate: vi.fn(),
  onViewHistory: vi.fn(),
  onDelete: vi.fn(),
});

function renderCard(revenue: FixedRevenue, current = { year: 2026, month: 9 }) {
  const handlers = HANDLERS();
  render(
    <FixedRevenueCard
      revenue={revenue}
      {...handlers}
      currentYear={current.year}
      currentMonth={current.month}
    />,
  );
  return handlers;
}

describe("FixedRevenueCard: conteúdo", () => {
  it("exibe a descrição e o valor da versão vigente", () => {
    const version = makeFixedRevenueVersion({ description: "Salário", amount: 8000 });
    renderCard(makeFixedRevenue({ currentVersion: version, versions: [version] }));

    expect(screen.getByTestId("fixed-revenue-card")).toBeInTheDocument();
    expect(screen.getByText("Salário")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?8\.000,00/)).toBeInTheDocument();
  });

  it('exibe o badge "Fixa"', () => {
    renderCard(makeFixedRevenue());

    expect(screen.getByText("Fixa")).toBeInTheDocument();
  });

  it.each([
    ["ALTERABLE", "Alterável"],
    ["UNALTERABLE", "Inalterável"],
  ] as const)("exibe a modalidade %s como %s", (modality, label) => {
    renderCard(makeFixedRevenue({ modality }));

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('mostra "em aberto" quando não há término', () => {
    renderCard(makeFixedRevenue({ startYear: 2026, startMonth: 9 }));

    expect(screen.getByText(/Vigência: Set\/26 → em aberto/)).toBeInTheDocument();
  });

  it("mostra a competência de término quando há uma", () => {
    renderCard(makeFixedRevenue({ startYear: 2026, startMonth: 9, endYear: 2027, endMonth: 3 }), {
      year: 2026,
      month: 9,
    });

    expect(screen.getByText(/Vigência: Set\/26 → Mar\/27/)).toBeInTheDocument();
  });

  it.each([
    [0, "0 versões"],
    [1, "1 versão"],
    [2, "2 versões"],
  ])("pluraliza %i como %s", (count, text) => {
    const versions = Array.from({ length: count }, () => makeFixedRevenueVersion());
    renderCard(makeFixedRevenue({ versions: count ? versions : [] }));

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('mostra "—" e R$ 0,00 quando a versão vigente não vem', () => {
    const revenue = makeFixedRevenue();
    renderCard({ ...revenue, currentVersion: undefined as never });

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s?0,00/)).toBeInTheDocument();
  });

  it("trata versions undefined como zero versões", () => {
    renderCard(makeFixedRevenue());

    expect(screen.getByText("0 versões")).toBeInTheDocument();
  });
});

describe("FixedRevenueCard: ações", () => {
  it('"Nova versão" aparece só em receita ALTERABLE não encerrada', async () => {
    const revenue = makeFixedRevenue({ modality: "ALTERABLE" });
    const { onAddVersion } = renderCard(revenue);

    await userEvent.click(screen.getByRole("button", { name: /Nova versão/ }));

    expect(onAddVersion).toHaveBeenCalledWith(revenue);
  });

  it('"Nova versão" NÃO aparece em receita UNALTERABLE', () => {
    renderCard(makeFixedRevenue({ modality: "UNALTERABLE" }));

    expect(screen.queryByRole("button", { name: /Nova versão/ })).not.toBeInTheDocument();
  });

  it('"Encerrar" chama onTerminate com o registro', async () => {
    const revenue = makeFixedRevenue();
    const { onTerminate } = renderCard(revenue);

    await userEvent.click(screen.getByRole("button", { name: /Encerrar/ }));

    expect(onTerminate).toHaveBeenCalledWith(revenue);
  });

  it('"Ver histórico" chama onViewHistory com a receita inteira', async () => {
    const revenue = makeFixedRevenue();
    const { onViewHistory } = renderCard(revenue);

    await userEvent.click(screen.getByRole("button", { name: /Ver histórico/ }));

    expect(onViewHistory).toHaveBeenCalledWith(revenue);
  });

  it("o botão de lixeira chama onDelete com o id", async () => {
    const revenue = makeFixedRevenue();
    const { onDelete } = renderCard(revenue);
    const buttons = screen.getAllByRole("button");

    await userEvent.click(buttons[buttons.length - 1]);

    expect(onDelete).toHaveBeenCalledWith(revenue.id);
  });
});

describe("FixedRevenueCard: encerrada", () => {
  it("marca como encerrada quando o término já passou e esconde as ações de alteração", () => {
    renderCard(makeFixedRevenue({ endYear: 2026, endMonth: 8 }), { year: 2026, month: 9 });

    expect(screen.getByText("Encerrada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nova versão/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Encerrar/ })).not.toBeInTheDocument();
  });

  it("NÃO marca como encerrada quando o término é o mês corrente", () => {
    renderCard(makeFixedRevenue({ endYear: 2026, endMonth: 9 }), { year: 2026, month: 9 });

    expect(screen.queryByText("Encerrada")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Encerrar/ })).toBeInTheDocument();
  });

  it("marca como encerrada quando o ano de término é anterior", () => {
    renderCard(makeFixedRevenue({ endYear: 2025, endMonth: 12 }), { year: 2026, month: 9 });

    expect(screen.getByText("Encerrada")).toBeInTheDocument();
  });

  it("NÃO marca como encerrada quando o término é futuro", () => {
    renderCard(makeFixedRevenue({ endYear: 2027, endMonth: 1 }), { year: 2026, month: 9 });

    expect(screen.queryByText("Encerrada")).not.toBeInTheDocument();
  });
});
