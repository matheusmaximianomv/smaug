import { cenarioDashboardCompleto } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { goto, kpiCard, panel } from "../../src/support/ui.js";

test.describe("dashboard", () => {
  test("usuário sem lançamentos vê tudo zerado", async ({ page }) => {
    await goto(page, "/dashboard");

    await expect(kpiCard(page, "Total de receitas")).toContainText(brl(0));
    await expect(kpiCard(page, "Total de despesas")).toContainText(brl(0));
    await expect(kpiCard(page, "Saldo do mês")).toContainText(brl(0));

    await expect(page.getByText("Nenhuma receita neste mês.")).toBeVisible();
    await expect(page.getByText("Nenhuma despesa neste mês.")).toBeVisible();
    await expect(page.getByText("Nenhuma despesa registrada neste mês.")).toBeVisible();
  });

  test("consolida receitas e despesas do mês vigente", async ({ page, seed, competence }) => {
    const cenario = await cenarioDashboardCompleto(seed, competence);
    await goto(page, "/dashboard");

    await expect(kpiCard(page, "Total de receitas")).toContainText(brl(cenario.totalRevenues));
    await expect(kpiCard(page, "Total de despesas")).toContainText(brl(cenario.totalExpenses));
    await expect(kpiCard(page, "Saldo do mês")).toContainText(
      brl(cenario.totalRevenues - cenario.totalExpenses),
    );
    await expect(kpiCard(page, "Saldo do mês")).toContainText("Superávit");

    const receitas = panel(page, "Receitas do período");
    await expect(receitas).toContainText(cenario.oneTimeRevenue.description);
    await expect(receitas).toContainText(cenario.fixedRevenue.currentVersion!.description);
    await expect(receitas.getByText("Avulsa", { exact: true })).toBeVisible();
    await expect(receitas.getByText("Fixa", { exact: true })).toBeVisible();
    await expect(receitas.getByRole("row").filter({ hasText: "Total" })).toContainText(
      brl(cenario.totalRevenues),
    );

    const despesas = panel(page, "Despesas do período");
    await expect(despesas).toContainText(cenario.oneTimeExpense.description);
    await expect(despesas).toContainText(cenario.installment.description);
    await expect(despesas).toContainText(cenario.recurring.currentVersion.description);
    await expect(despesas.getByText("Avulsa", { exact: true })).toBeVisible();
    await expect(despesas.getByText("Parcelada", { exact: true })).toBeVisible();
    await expect(despesas.getByText("Recorrente", { exact: true })).toBeVisible();
    await expect(despesas.getByRole("row").filter({ hasText: "Total" })).toContainText(
      brl(cenario.totalExpenses),
    );
  });

  test("aponta déficit quando as despesas superam as receitas", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Moradia");
    await seed.createOneTimeRevenue({
      description: "Bico",
      amount: 200,
      competence: competence.current,
    });
    await seed.createOneTimeExpense({
      description: "Conserto do carro",
      amount: 900,
      categoryId: category.id,
      competence: competence.current,
    });

    await goto(page, "/dashboard");

    await expect(kpiCard(page, "Saldo do mês")).toContainText("Déficit");
    await expect(kpiCard(page, "Saldo do mês")).toContainText(brl(-700));
  });

  test("mostra o percentual de cada categoria nas despesas", async ({ page, seed, competence }) => {
    const cenario = await cenarioDashboardCompleto(seed, competence);
    await goto(page, "/dashboard");

    const breakdown = panel(page, "Despesas por categoria");

    // O percentual é derivado do total do mês — calculado aqui a partir da
    // mesma verdade que a UI consome, nunca de um literal.
    const consulta = await seed.queryExpenses(competence.current);
    const porCategoria = new Map<string, number>();
    for (const expense of consulta.expenses) {
      porCategoria.set(
        expense.category.name,
        (porCategoria.get(expense.category.name) ?? 0) + expense.amount,
      );
    }
    expect(porCategoria.size).toBe(2);

    for (const [nome, valor] of porCategoria) {
      const percentual = ((valor / consulta.totals.total) * 100).toFixed(0);
      await expect(breakdown).toContainText(nome);
      await expect(breakdown).toContainText(brl(valor));
      await expect(breakdown).toContainText(`${percentual}% das despesas`);
    }
    expect([...porCategoria.keys()].sort()).toEqual(
      [cenario.categories.lazer.name, cenario.categories.moradia.name].sort(),
    );
  });

  test("a visão semestral cobre seis meses ao redor do mês vigente", async ({
    page,
    competence,
  }) => {
    await goto(page, "/dashboard");

    const chart = panel(page, "Visão semestral");
    for (let offset = -3; offset <= 2; offset += 1) {
      await expect(chart.getByText(monthShort(competence.plus(offset)))).toBeVisible();
    }
  });

  test("os totais exibidos batem com /revenues e /expenses", async ({ page, seed, competence }) => {
    await cenarioDashboardCompleto(seed, competence);
    await goto(page, "/dashboard");

    const receitas = await seed.queryRevenues(competence.current);
    const despesas = await seed.queryExpenses(competence.current);

    await expect(kpiCard(page, "Total de receitas")).toContainText(brl(receitas.totals.total));
    await expect(kpiCard(page, "Total de despesas")).toContainText(brl(despesas.totals.total));
    await expect(kpiCard(page, "Saldo do mês")).toContainText(
      brl(receitas.totals.total - despesas.totals.total),
    );
  });
});
