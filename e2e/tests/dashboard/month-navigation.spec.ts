import { expect, test } from "../../src/fixtures/test.js";
import { monthLong, monthShort } from "../../src/support/format.js";
import { goto, kpiCard, monthBadge, panel } from "../../src/support/ui.js";

test.describe("navegação entre meses no dashboard", () => {
  test("abre no mês vigente", async ({ page, competence }) => {
    await goto(page, "/dashboard");

    await expect(page.getByText(monthLong(competence.current))).toBeVisible();
    await expect(monthBadge(page, monthLong(competence.current))).toHaveText("Mês vigente");
    await expect(page.getByRole("button", { name: "← Mês atual" })).toBeHidden();
  });

  test("ir ao mês anterior marca o período como passado", async ({ page, competence }) => {
    await goto(page, "/dashboard");

    await page.getByRole("button", { name: "Mês anterior" }).click();

    await expect(page.getByText(monthLong(competence.prev))).toBeVisible();
    await expect(monthBadge(page, monthLong(competence.prev))).toHaveText("Passado");
    await expect(page.getByRole("button", { name: "← Mês atual" })).toBeVisible();
  });

  test("ir ao próximo mês vira projeção e renomeia os KPIs", async ({ page, competence }) => {
    await goto(page, "/dashboard");

    await page.getByRole("button", { name: "Próximo mês" }).click();

    await expect(page.getByText(monthLong(competence.next))).toBeVisible();
    await expect(monthBadge(page, monthLong(competence.next))).toHaveText("Projeção");
    await expect(kpiCard(page, "Receitas projetadas")).toBeVisible();
    await expect(kpiCard(page, "Despesas projetadas")).toBeVisible();
  });

  test("o atalho “← Mês atual” volta ao mês vigente", async ({ page, competence }) => {
    await goto(page, "/dashboard");

    await page.getByRole("button", { name: "Mês anterior" }).click();
    await expect(page.getByText(monthLong(competence.prev))).toBeVisible();

    await page.getByRole("button", { name: "← Mês atual" }).click();

    await expect(page.getByText(monthLong(competence.current))).toBeVisible();
    await expect(monthBadge(page, monthLong(competence.current))).toHaveText("Mês vigente");
  });

  test("receita fixa em aberto aparece também na projeção do mês seguinte", async ({
    page,
    seed,
    competence,
  }) => {
    const fixa = await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/dashboard");
    await expect(panel(page, "Receitas do período")).toContainText(
      fixa.currentVersion!.description,
    );

    await page.getByRole("button", { name: "Próximo mês" }).click();

    await expect(page.getByText(monthLong(competence.next))).toBeVisible();
    await expect(panel(page, "Receitas do período")).toContainText(
      fixa.currentVersion!.description,
    );
  });

  test("despesa avulsa do mês vigente não aparece no mês seguinte", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Alimentação");
    await seed.createOneTimeExpense({
      description: "Supermercado",
      amount: 250,
      categoryId: category.id,
      competence: competence.current,
    });
    await goto(page, "/dashboard");
    await expect(panel(page, "Despesas do período")).toContainText("Supermercado");

    await page.getByRole("button", { name: "Próximo mês" }).click();

    await expect(page.getByText(monthLong(competence.next))).toBeVisible();
    await expect(page.getByText("Nenhuma despesa neste mês.")).toBeVisible();
  });

  test("clicar numa coluna do gráfico semestral navega para aquele mês", async ({
    page,
    competence,
  }) => {
    await goto(page, "/dashboard");

    const chart = panel(page, "Visão semestral");
    await chart.getByTitle(new RegExp(`^${monthShort(competence.in2)}:`)).click();

    await expect(page.getByText(monthLong(competence.in2))).toBeVisible();
    await expect(monthBadge(page, monthLong(competence.in2))).toHaveText("Projeção");
  });
});
