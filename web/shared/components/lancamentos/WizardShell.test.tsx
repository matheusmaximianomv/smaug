import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WizardShell } from "./WizardShell";

function setup(step: number, firstStep?: number) {
  const handlers = { onClose: vi.fn(), onBack: vi.fn(), onContinue: vi.fn(), onConfirm: vi.fn() };
  render(
    <WizardShell
      title="Nova despesa"
      step={step}
      firstStep={firstStep}
      confirmLabel="Confirmar despesa"
      {...handlers}
    >
      <p>conteúdo</p>
    </WizardShell>,
  );
  return handlers;
}

const dialog = () => screen.getByRole("dialog", { name: "Nova despesa" });

describe("WizardShell na etapa Tipo", () => {
  it('oferece "Cancelar" e "Continuar"', async () => {
    const handlers = setup(0);

    expect(within(dialog()).getByText("conteúdo")).toBeInTheDocument();
    expect(within(dialog()).getByRole("listitem", { current: "step" })).toHaveTextContent("Tipo");
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await userEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(handlers.onClose).toHaveBeenCalledTimes(1);
    expect(handlers.onContinue).toHaveBeenCalledTimes(1);
  });

  it("fecha com Escape", async () => {
    const handlers = setup(0);

    await userEvent.keyboard("{Escape}");

    expect(handlers.onClose).toHaveBeenCalled();
  });
});

describe("WizardShell na Revisão", () => {
  it('troca Cancelar por "Voltar" e Continuar pelo rótulo de confirmação', async () => {
    const handlers = setup(2);

    expect(screen.queryByRole("button", { name: "Continuar" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Voltar" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar despesa" }));

    expect(handlers.onBack).toHaveBeenCalledTimes(1);
    expect(handlers.onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("WizardShell na edição", () => {
  it("não volta para antes de Detalhes", () => {
    setup(1, 1);

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voltar" })).not.toBeInTheDocument();
  });
});
