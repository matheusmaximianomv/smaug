import { cenarioParcelamento } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, cellAmount, csvCompetence } from "../../src/support/format.js";
import { dialog, ficha, goto } from "../../src/support/ui.js";

test.describe("despesas parceladas", () => {
  test("a Revisão divide R$ 100,00 em 3× com os centavos na 1ª e o servidor grava o mesmo", async ({
    page,
    seed,
  }) => {
    await seed.createCategory("Eletrônicos");
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Nova despesa" }).click();
    await dialog(page)
      .getByRole("radio", { name: /Parcelada/ })
      .click();
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByLabel("Descrição").fill("Fone");
    await dialog(page)
      .getByLabel(/Valor total/)
      .fill("100");
    await dialog(page).getByLabel("Categoria").selectOption({ label: "Eletrônicos" });
    await dialog(page).getByRole("button", { name: "Aumentar" }).click();
    await dialog(page).getByRole("button", { name: "Continuar" }).click();

    const meses = dialog(page).getByRole("list", { name: "Meses afetados" }).getByRole("listitem");
    await expect(meses).toHaveCount(3);
    await expect(meses.nth(0)).toContainText("33,34");
    await expect(meses.nth(1)).toContainText("33,33");
    await expect(meses.nth(2)).toContainText("33,33");
    await expect(dialog(page)).toContainText(
      `Os centavos que sobram da divisão entram na 1ª parcela (${brl(33.34)}).`,
    );
    await dialog(page).getByRole("button", { name: "Confirmar despesa" }).click();

    await expect(page.getByText("Parcelamento criado")).toBeVisible();
    const [gravado] = await seed.listInstallmentExpenses();
    expect(gravado.installments.map((i) => i.amount)).toEqual([33.34, 33.33, 33.33]);
  });

  test("parcelamento em andamento: a grade marca Paga/Atual e Encerrar remove as futuras", async ({
    page,
    seed,
    competence,
  }) => {
    // A situação das parcelas vem do relógio do SERVIDOR; o único jeito de ter
    // uma parcela já paga é importar a série com o 1º mês no passado.
    await seed.importCsv([
      `${csvCompetence(competence.prev)};despesa;Eletrônicos;Notebook;33,34;parcelada;1;3;s1;`,
      `${csvCompetence(competence.current)};despesa;Eletrônicos;Notebook;33,33;parcelada;2;3;s1;`,
      `${csvCompetence(competence.next)};despesa;Eletrônicos;Notebook;33,33;parcelada;3;3;s1;`,
    ]);
    await goto(page, "/despesas");

    await expect(page.getByRole("button", { name: /Notebook/ })).toContainText("Parcela 2 de 3");
    await page.getByRole("button", { name: /Notebook/ }).click();
    const notebook = ficha(page, "Notebook");
    const parcelas = notebook.getByRole("list", { name: "Parcelas" }).getByRole("listitem");
    await expect(parcelas.nth(0)).toContainText("paga");
    await expect(parcelas.nth(1)).toContainText("ATUAL");
    await expect(parcelas.nth(2)).toContainText("pendente");
    await expect(notebook.getByRole("button", { name: "Remover parcelamento" })).toHaveCount(0);

    await notebook.getByRole("button", { name: "Encerrar parcelamento" }).click();
    await page
      .getByRole("dialog", { name: "Encerrar parcelamento?" })
      .getByRole("button", { name: "Encerrar" })
      .click();

    await expect(page.getByText("Parcelamento encerrado")).toBeVisible();
    await expect(
      notebook.getByRole("list", { name: "Parcelas" }).getByRole("listitem"),
    ).toHaveCount(2);
    await notebook.getByRole("button", { name: "Fechar" }).last().click();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("button", { name: /Notebook/ })).toHaveCount(0);
  });

  test("parcelamento sem parcela paga pode ser removido", async ({ page, seed, competence }) => {
    const { installment } = await cenarioParcelamento(seed, competence, {
      parcelas: 2,
      total: 300,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: /Notebook/ }).click();
    const notebook = ficha(page, "Notebook");
    await expect(notebook).toContainText(`2× de ${brl(installment.installments[1].amount)}`);
    await expect(notebook.getByRole("list", { name: "Parcelas" })).toContainText(
      cellAmount(installment.installments[0].amount),
    );
    await notebook.getByRole("button", { name: "Remover parcelamento" }).click();
    await page
      .getByRole("dialog", { name: "Remover parcelamento?" })
      .getByRole("button", { name: "Remover" })
      .click();

    await expect(page.getByText("Parcelamento removido")).toBeVisible();
    expect(await seed.listInstallmentExpenses()).toHaveLength(0);
  });
});
