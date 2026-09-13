import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

test.describe("receitas avulsas", () => {
  test("estado vazio informa que não há receitas avulsas", async ({ page }) => {
    await goto(page, "/receitas");

    await expect(page.getByText("Nenhuma receita avulsa cadastrada.")).toBeVisible();
  });

  test("cria uma receita avulsa na competência vigente", async ({ page, competence }) => {
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Nova receita avulsa" }).click();
    const modal = dialog(page);
    await modal.getByPlaceholder("Ex: Freelance, bônus...").fill("Freelance de site");
    await modal.getByLabel("Valor (R$)").fill("1500,00");
    await fillCompetence(modal, "Competência", competence.current);
    await modal.getByRole("button", { name: "Adicionar receita" }).click();

    const row = page.getByRole("row").filter({ hasText: "Freelance de site" });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(monthShort(competence.current));
    await expect(row).toContainText(brl(1500));
  });

  test("edita uma receita avulsa existente", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Freelance",
      amount: 1000,
      competence: competence.current,
    });
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Editar" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Freelance revisado");
    await modal.getByLabel("Valor (R$)").fill("1250,50");
    await modal.getByRole("button", { name: "Salvar alterações" }).click();

    const row = page.getByRole("row").filter({ hasText: "Freelance revisado" });
    await expect(row).toContainText(brl(1250.5));
  });

  test("exclui uma receita avulsa após confirmação", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Bônus",
      amount: 800,
      competence: competence.current,
    });
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Excluir" }).click();

    await expect(
      dialog(page).getByText('Tem certeza que deseja excluir a receita "Bônus"?'),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Nenhuma receita avulsa cadastrada.")).toBeVisible();
  });

  test("bloqueia a criação em competência passada", async ({ page, competence }) => {
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Nova receita avulsa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Receita retroativa");
    await modal.getByLabel("Valor (R$)").fill("100");
    // `selectableYears()` oferece de ano-1 a ano+3, então o ano passado é alcançável.
    await fillCompetence(modal, "Competência", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Adicionar receita" }).click();

    await expect(
      modal.getByText("Não é permitido criar receitas em competências passadas."),
    ).toBeVisible();
    await expect(page.getByText("Nenhuma receita avulsa cadastrada.")).toBeVisible();
  });

  test("recusa valor não numérico", async ({ page }) => {
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Nova receita avulsa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Receita inválida");
    await modal.getByLabel("Valor (R$)").fill("abc");
    await modal.getByRole("button", { name: "Adicionar receita" }).click();

    await expect(modal.getByText("Valor inválido. Use número positivo.")).toBeVisible();
  });

  test("ordena a tabela por competência decrescente", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Receita do mês vigente",
      amount: 100,
      competence: competence.current,
    });
    await seed.createOneTimeRevenue({
      description: "Receita de daqui a dois meses",
      amount: 300,
      competence: competence.in2,
    });
    await seed.createOneTimeRevenue({
      description: "Receita do mês seguinte",
      amount: 200,
      competence: competence.next,
    });

    await goto(page, "/receitas");

    await expect(page.locator("tbody tr")).toHaveText([
      /Receita de daqui a dois meses/,
      /Receita do mês seguinte/,
      /Receita do mês vigente/,
    ]);
  });
});
