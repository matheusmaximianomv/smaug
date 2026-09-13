import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeCategoryWithCount } from "../../../tests/fixtures";
import { freezeDateOnly, unfreezeTime } from "../../../tests/time";
import { InstallmentForm } from "./InstallmentForm";

const CATEGORIES = [
  makeCategoryWithCount({ id: "cat-1", name: "Moradia" }),
  makeCategoryWithCount({ id: "cat-2", name: "Eletrônicos" }),
];

/** `getNow()` usa `new Date()` direto: congelar o Date define o padrão do MonthYearSelect. */
beforeEach(() => {
  freezeDateOnly(new Date("2026-09-13T00:00:00Z"));
});

afterEach(() => {
  unfreezeTime();
});

function renderForm(props: Partial<React.ComponentProps<typeof InstallmentForm>> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<InstallmentForm categories={CATEGORIES} onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose };
}

async function fill(fields: { desc?: string; total?: string; count?: string; cat?: string }) {
  if (fields.desc) await userEvent.type(screen.getByLabelText("Descrição"), fields.desc);
  if (fields.total) await userEvent.type(screen.getByLabelText("Valor total (R$)"), fields.total);
  if (fields.count) await userEvent.type(screen.getByLabelText("Nº de parcelas"), fields.count);
  if (fields.cat) await userEvent.selectOptions(screen.getByLabelText("Categoria"), fields.cat);
}

const submit = () => userEvent.click(screen.getByRole("button", { name: "Criar parcelamento" }));

describe("InstallmentForm: preview do valor da parcela", () => {
  it.each([
    ["100", "3", "R$ 33,33"],
    ["10", "3", "R$ 3,33"],
    ["1200", "12", "R$ 100,00"],
    ["1234,56", "2", "R$ 617,28"],
    // Regressão: com o antigo `parseFloat(v.replace(",", "."))` isto virava
    // 1.234 e a parcela saía R$ 0,61 — em silêncio. Ver shared/lib/parseAmount.
    ["1.234,56", "2", "R$ 617,28"],
    ["1.200", "12", "R$ 100,00"],
    ["1", "72", "R$ 0,01"],
    ["0,10", "3", "R$ 0,03"],
  ])("total %s em %s parcelas → %s (trunca, não arredonda)", async (total, count, expected) => {
    renderForm();

    await fill({ total, count });

    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it.each([
    ["", "3", "total vazio"],
    ["abc", "3", "total não numérico"],
    ["100", "", "número de parcelas vazio"],
    ["100", "0", "zero parcelas"],
    ["100", "73", "mais de 72 parcelas"],
    ["100", "-1", "parcelas negativas"],
  ])("não exibe preview com %s / %s (%s)", async (total, count) => {
    renderForm();

    await fill({ total, count });

    expect(screen.queryByText(/Cada parcela:/)).not.toBeInTheDocument();
  });

  it("exibe o preview dentro dos limites", async () => {
    renderForm();

    await fill({ total: "100", count: "72" });

    expect(screen.getByText(/Cada parcela:/)).toBeInTheDocument();
  });
});

describe("InstallmentForm: validações", () => {
  it("exige a descrição", async () => {
    const { onSave } = renderForm();

    await fill({ total: "100", count: "3", cat: "cat-1" });
    await submit();

    expect(screen.getByText("Descrição obrigatória.")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("rejeita descrição só com espaços", async () => {
    renderForm();

    await fill({ desc: "   ", total: "100", count: "3", cat: "cat-1" });
    await submit();

    expect(screen.getByText("Descrição obrigatória.")).toBeInTheDocument();
  });

  it("exige valor total válido", async () => {
    renderForm();

    await fill({ desc: "Notebook", count: "3", cat: "cat-1" });
    await submit();

    expect(screen.getByText("Valor total inválido.")).toBeInTheDocument();
  });

  it("rejeita valor total zero ou negativo", async () => {
    renderForm();

    await fill({ desc: "Notebook", total: "0", count: "3", cat: "cat-1" });
    await submit();

    expect(screen.getByText("Valor total inválido.")).toBeInTheDocument();
  });

  it.each([
    ["0", true],
    ["1", false],
    ["72", false],
    ["73", true],
  ])("nº de parcelas %s → erro de limite: %s", async (count, shouldFail) => {
    renderForm();

    await fill({ desc: "Notebook", total: "100", count, cat: "cat-1" });
    await submit();

    const error = screen.queryByText("Entre 1 e 72 parcelas.");
    if (shouldFail) expect(error).toBeInTheDocument();
    else expect(error).not.toBeInTheDocument();
  });

  it("exige o número de parcelas", async () => {
    renderForm();

    await fill({ desc: "Notebook", total: "100", cat: "cat-1" });
    await submit();

    expect(screen.getByText("Entre 1 e 72 parcelas.")).toBeInTheDocument();
  });

  it("exige a categoria", async () => {
    renderForm();

    await fill({ desc: "Notebook", total: "100", count: "3" });
    await submit();

    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument();
  });

  it("bloqueia a primeira parcela em competência passada", async () => {
    renderForm();

    await fill({ desc: "Notebook", total: "100", count: "3", cat: "cat-1" });
    await userEvent.selectOptions(screen.getByLabelText("Primeira parcela em — mês"), "8");
    await submit();

    expect(
      screen.getByText("A primeira parcela não pode cair em competência passada."),
    ).toBeInTheDocument();
  });
});

describe("InstallmentForm: sucesso", () => {
  it("envia o payload com a descrição sem espaços nas pontas", async () => {
    const { onSave } = renderForm();

    await fill({ desc: "  Notebook  ", total: "3600", count: "12", cat: "cat-2" });
    await submit();

    expect(onSave).toHaveBeenCalledWith({
      description: "Notebook",
      totalAmount: 3600,
      installmentCount: 12,
      categoryId: "cat-2",
      startYear: 2026,
      startMonth: 9,
    });
  });

  it("aceita vírgula como separador decimal", async () => {
    const { onSave } = renderForm();

    await fill({ desc: "Notebook", total: "1234,56", count: "2", cat: "cat-1" });
    await submit();

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ totalAmount: 1234.56 }));
  });

  it("usa a competência escolhida no MonthYearSelect", async () => {
    const { onSave } = renderForm();

    await fill({ desc: "Notebook", total: "100", count: "2", cat: "cat-1" });
    await userEvent.selectOptions(screen.getByLabelText("Primeira parcela em — mês"), "12");
    await userEvent.selectOptions(screen.getByLabelText("Primeira parcela em — ano"), "2027");
    await submit();

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ startYear: 2027, startMonth: 12 }),
    );
  });

  it("lista as categorias recebidas", () => {
    renderForm();

    expect(screen.getByRole("option", { name: "Moradia" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Eletrônicos" })).toBeInTheDocument();
  });

  it("Cancelar chama onClose", async () => {
    const { onClose, onSave } = renderForm();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("desabilita o botão enquanto isLoading", () => {
    renderForm({ isLoading: true });

    expect(screen.getByRole("button", { name: "Criar parcelamento" })).toBeDisabled();
  });
});
