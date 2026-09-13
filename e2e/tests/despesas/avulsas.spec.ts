import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

test.describe("despesas avulsas", () => {
  test("estado vazio informa que não há despesas avulsas", async ({ page }) => {
    await goto(page, "/despesas");

    await expect(page.getByText("Nenhuma despesa avulsa cadastrada.")).toBeVisible();
  });

  test("cria uma despesa avulsa vinculada a uma categoria", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Alimentação");
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Nova despesa avulsa" }).click();
    const modal = dialog(page);
    await modal.getByPlaceholder("Ex: Supermercado, consulta médica...").fill("Supermercado");
    await modal.getByLabel("Valor (R$)").fill("250,90");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Competência", competence.current);
    await modal.getByRole("button", { name: "Adicionar despesa" }).click();

    const row = page.getByRole("row").filter({ hasText: "Supermercado" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(category.name);
    await expect(row).toContainText(monthShort(competence.current));
    await expect(row).toContainText(brl(250.9));
  });

  test("exige uma categoria", async ({ page, seed }) => {
    await seed.createCategory("Alimentação");
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Nova despesa avulsa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Despesa sem categoria");
    await modal.getByLabel("Valor (R$)").fill("50");
    await modal.getByRole("button", { name: "Adicionar despesa" }).click();

    await expect(modal.getByText("Selecione uma categoria.")).toBeVisible();
    await expect(page.getByText("Nenhuma despesa avulsa cadastrada.")).toBeVisible();
  });

  test("edita uma despesa avulsa existente", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Alimentação");
    await seed.createOneTimeExpense({
      description: "Padaria",
      amount: 30,
      categoryId: category.id,
      competence: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Editar" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Padaria da esquina");
    await modal.getByLabel("Valor (R$)").fill("45,30");
    await modal.getByRole("button", { name: "Salvar" }).click();

    const row = page.getByRole("row").filter({ hasText: "Padaria da esquina" });
    await expect(row).toContainText(brl(45.3));
  });

  test("exclui uma despesa avulsa após confirmação", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Alimentação");
    await seed.createOneTimeExpense({
      description: "Padaria",
      amount: 30,
      categoryId: category.id,
      competence: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Excluir" }).click();

    await expect(dialog(page).getByText('Excluir a despesa "Padaria"?')).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Nenhuma despesa avulsa cadastrada.")).toBeVisible();
  });

  test("bloqueia a criação em competência passada", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Alimentação");
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Nova despesa avulsa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Despesa retroativa");
    await modal.getByLabel("Valor (R$)").fill("100");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Competência", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Adicionar despesa" }).click();

    await expect(
      modal.getByText("Não é permitido criar despesas em competências passadas."),
    ).toBeVisible();
    await expect(page.getByText("Nenhuma despesa avulsa cadastrada.")).toBeVisible();
  });
});
