import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LedgerEmptyState } from "./LedgerEmptyState";

const PROPS = {
  title: "Nenhuma despesa em fevereiro 2026",
  hint: "Recorrentes e parcelas futuras aparecem aqui automaticamente.",
  actionLabel: "Adicionar despesa",
};

describe("LedgerEmptyState em mês passado", () => {
  it("explica a regra e não oferece botão", () => {
    render(<LedgerEmptyState {...PROPS} isPast onAction={vi.fn()} />);

    expect(screen.getByText(PROPS.title)).toBeInTheDocument();
    expect(
      screen.getByText(
        "Competências passadas não aceitam novos lançamentos. Use as setas para voltar ao período vigente.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("LedgerEmptyState em mês corrente ou futuro", () => {
  it("mostra a dica e o botão de adicionar", async () => {
    const onAction = vi.fn();
    render(<LedgerEmptyState {...PROPS} isPast={false} onAction={onAction} />);

    expect(screen.getByText(PROPS.hint)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Adicionar despesa" }));

    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
