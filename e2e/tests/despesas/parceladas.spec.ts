import type { Page } from "@playwright/test";
import { cenarioParcelamento } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

/** A aba traz o contador no nome acessível ("Parceladas 2"), daí o regex. */
async function abrirAbaParceladas(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /^Parceladas/ }).click();
}

test.describe("despesas parceladas", () => {
  test("estado vazio oferece criar o primeiro parcelamento", async ({ page }) => {
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await expect(page.getByText("Nenhum parcelamento cadastrado.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Criar parcelamento" })).toBeVisible();
  });

  test("mostra o valor de cada parcela antes de salvar", async ({ page, seed }) => {
    await seed.createCategory("Lazer");
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByRole("button", { name: "Novo parcelamento" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Valor total (R$)").fill("300,00");
    await modal.getByLabel("Nº de parcelas").fill("3");

    await expect(modal.getByText(`Cada parcela: ${brl(100)}`)).toBeVisible();
  });

  test("cria um parcelamento e o card resume o plano", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Lazer");
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByRole("button", { name: "Novo parcelamento" }).click();
    const modal = dialog(page);
    await modal.getByPlaceholder("Ex: Notebook, TV, viagem...").fill("Notebook");
    await modal.getByLabel("Valor total (R$)").fill("300,00");
    await modal.getByLabel("Nº de parcelas").fill("3");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Primeira parcela em", competence.current);
    await modal.getByRole("button", { name: "Criar parcelamento" }).click();

    const card = page.getByTestId("installment-card");
    await expect(card).toHaveCount(1);

    // Os valores vêm da API: a divisão em centavos é regra de domínio.
    const [criado] = await seed.listInstallmentExpenses();
    await expect(card).toContainText(
      `3× · ${monthShort(competence.current)} → ${monthShort(competence.in2)}`,
    );
    await expect(card).toContainText("0/3 pagas");
    await expect(card).toContainText(`${brl(criado.installments[0].amount)}/parcela`);
    await expect(card).toContainText(`${brl(criado.totalAmount)} total`);
    await expect(card).toContainText("Parcelada");
    await expect(card).toContainText(category.name);
  });

  test("lista as parcelas com a competência de cada uma", async ({ page, seed, competence }) => {
    const { installment } = await cenarioParcelamento(seed, competence, {
      parcelas: 3,
      total: 300,
      description: "Notebook",
    });
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByRole("button", { name: "Ver parcelas" }).click();

    const modal = dialog(page);
    await expect(modal.getByText(`Parcelas — ${installment.description}`)).toBeVisible();
    for (const parcela of installment.installments) {
      await expect(
        modal.getByText(`${parcela.installmentNumber}/${installment.installmentCount}`, {
          exact: true,
        }),
      ).toBeVisible();
      await expect(modal).toContainText(
        monthShort({ year: parcela.competenceYear, month: parcela.competenceMonth }),
      );
    }
    // A parcela do mês vigente é a única marcada como atual.
    await expect(modal.getByText("Atual")).toHaveCount(1);
    await expect(modal.getByText("Pago")).toHaveCount(0);
  });

  // ⏱ Estado passado só existe no relógio do cliente: `shiftClock` avança o
  // browser um mês, então a primeira parcela vira passado.
  test("após um mês a primeira parcela consta como paga", async ({
    page,
    seed,
    competence,
    shiftClock,
  }) => {
    const { installment } = await cenarioParcelamento(seed, competence, {
      parcelas: 3,
      total: 300,
      description: "Notebook",
    });

    await shiftClock(1);
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await expect(page.getByTestId("installment-card")).toContainText("1/3 pagas");

    await page.getByRole("button", { name: "Ver parcelas" }).click();
    const modal = dialog(page);
    await expect(modal.getByText("Pago")).toHaveCount(1);
    await expect(modal).toContainText(
      monthShort({
        year: installment.installments[0].competenceYear,
        month: installment.installments[0].competenceMonth,
      }),
    );
  });

  test("recusa número de parcelas fora de 1 a 72", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Lazer");
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByRole("button", { name: "Novo parcelamento" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Notebook");
    await modal.getByLabel("Valor total (R$)").fill("300,00");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Primeira parcela em", competence.current);

    await modal.getByLabel("Nº de parcelas").fill("0");
    await modal.getByRole("button", { name: "Criar parcelamento" }).click();
    await expect(modal.getByText("Entre 1 e 72 parcelas.")).toBeVisible();

    await modal.getByLabel("Nº de parcelas").fill("73");
    await modal.getByRole("button", { name: "Criar parcelamento" }).click();
    await expect(modal.getByText("Entre 1 e 72 parcelas.")).toBeVisible();

    await expect(page.getByText("Nenhum parcelamento cadastrado.")).toBeVisible();
  });

  test("bloqueia primeira parcela em competência passada", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Lazer");
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByRole("button", { name: "Novo parcelamento" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Notebook");
    await modal.getByLabel("Valor total (R$)").fill("300,00");
    await modal.getByLabel("Nº de parcelas").fill("3");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Primeira parcela em", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Criar parcelamento" }).click();

    await expect(
      modal.getByText("A primeira parcela não pode cair em competência passada."),
    ).toBeVisible();
  });

  test("exclui o parcelamento inteiro após confirmação", async ({ page, seed, competence }) => {
    await cenarioParcelamento(seed, competence, { parcelas: 3, total: 300 });
    await goto(page, "/despesas");
    await abrirAbaParceladas(page);

    await page.getByTestId("installment-card").getByRole("button", { name: "Excluir" }).click();

    await expect(
      dialog(page).getByText("Excluir todo o parcelamento? Todas as parcelas serão removidas."),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Nenhum parcelamento cadastrado.")).toBeVisible();
  });

  test("os valores das parcelas somam o total", async ({ page, seed, competence }) => {
    // 100,00 em 3 não divide exato: o resto vai para a PRIMEIRA parcela.
    const { installment } = await cenarioParcelamento(seed, competence, {
      parcelas: 3,
      total: 100,
      description: "Fone de ouvido",
    });

    const soma = installment.installments.reduce((total, i) => total + i.amount, 0);
    expect(Number(soma.toFixed(2))).toBe(installment.totalAmount);

    await goto(page, "/despesas");
    await abrirAbaParceladas(page);
    await page.getByRole("button", { name: "Ver parcelas" }).click();

    const modal = dialog(page);
    for (const parcela of installment.installments) {
      await expect(modal).toContainText(brl(parcela.amount));
    }
  });
});
