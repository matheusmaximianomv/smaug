import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { makeInstallmentExpense } from "../../../tests/fixtures";
import { InstallmentModal } from "./InstallmentModal";

const CURRENT = { currentYear: 2026, currentMonth: 10 };

describe("InstallmentModal", () => {
  it("não renderiza nada quando expense é null", () => {
    const { container } = render(
      <InstallmentModal isOpen onClose={vi.fn()} expense={null} {...CURRENT} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("usa a descrição da despesa no título", () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({ description: "Notebook" })}
        {...CURRENT}
      />,
    );

    expect(screen.getByText("Parcelas — Notebook")).toBeInTheDocument();
  });

  it("lista cada parcela com competência, número e valor", () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({
          installmentCount: 3,
          totalAmount: 300,
          startYear: 2026,
          startMonth: 9,
        })}
        {...CURRENT}
      />,
    );

    expect(screen.getByText("Set/26")).toBeInTheDocument();
    expect(screen.getByText("Out/26")).toBeInTheDocument();
    expect(screen.getByText("Nov/26")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
    expect(screen.getAllByText(/R\$\s?100,00/)).toHaveLength(3);
  });

  it('marca como "Pago" apenas as parcelas de competências passadas', () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({ installmentCount: 3, startYear: 2026, startMonth: 9 })}
        {...CURRENT}
      />,
    );

    expect(screen.getAllByText("Pago")).toHaveLength(1);
  });

  it('marca como "Atual" a parcela do mês corrente', () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({ installmentCount: 3, startYear: 2026, startMonth: 9 })}
        {...CURRENT}
      />,
    );

    expect(screen.getAllByText("Atual")).toHaveLength(1);
  });

  it("não marca nada quando todas as parcelas são futuras", () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({ installmentCount: 3, startYear: 2027, startMonth: 1 })}
        {...CURRENT}
      />,
    );

    expect(screen.queryByText("Pago")).not.toBeInTheDocument();
    expect(screen.queryByText("Atual")).not.toBeInTheDocument();
  });

  it("considera passadas as parcelas de anos anteriores", () => {
    render(
      <InstallmentModal
        isOpen
        onClose={vi.fn()}
        expense={makeInstallmentExpense({ installmentCount: 2, startYear: 2025, startMonth: 11 })}
        {...CURRENT}
      />,
    );

    expect(screen.getAllByText("Pago")).toHaveLength(2);
  });
});
