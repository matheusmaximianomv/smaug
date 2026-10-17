import { expect, test } from "../../src/fixtures/test.js";
import { brl, compact, monthTitle } from "../../src/support/format.js";
import { MONTH_NAMES_SHORT } from "../../src/support/month-names.js";
import { dialog, ficha, goto, monthStrip } from "../../src/support/ui.js";

test.describe("despesas avulsas", () => {
  test("cria uma avulsa pelo assistente e ela entra no grupo, no total e na faixa", async ({
    page,
    seed,
    competence,
  }) => {
    await seed.createCategory("Saúde");
    await goto(page, "/despesas");
    await expect(page.getByRole("heading", { name: monthTitle(competence.current) })).toBeVisible();

    await page.getByRole("button", { name: "Nova despesa" }).click();
    await expect(dialog(page).getByRole("radio", { name: /Avulsa/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByLabel("Descrição").fill("Farmácia");
    await dialog(page)
      .getByLabel(/^Valor/)
      .fill("1.234,56");
    await dialog(page).getByLabel("Categoria").selectOption({ label: "Saúde" });
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByRole("button", { name: "Confirmar despesa" }).click();

    await expect(page.getByText("Despesa adicionada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Avulsas" })).toContainText("Farmácia");
    await expect(page.getByRole("region", { name: "Resumo do mês" })).toContainText(brl(1234.56));
    const cell = monthStrip(page).getByRole("button", {
      name: new RegExp(`^${MONTH_NAMES_SHORT[competence.current.month - 1]}`),
    });
    await expect(cell).toContainText(compact(1234.56));

    const { expenses } = await seed.queryExpenses(competence.current);
    expect(expenses.map((e) => [e.description, e.amount])).toEqual([["Farmácia", 1234.56]]);
  });

  test("edita uma avulsa do mês corrente pela Ficha", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Saúde");
    await seed.createOneTimeExpense({
      description: "Farmácia",
      amount: 50,
      categoryId: category.id,
      competence: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: /Farmácia/ }).click();
    await expect(ficha(page, "Farmácia")).toContainText("Prevista");
    await ficha(page, "Farmácia").getByRole("button", { name: "Editar" }).click();
    await dialog(page)
      .getByLabel(/^Valor/)
      .fill("75");
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByRole("button", { name: "Salvar alterações" }).click();

    await expect(page.getByText("Despesa atualizada")).toBeVisible();
    await expect(page.getByRole("button", { name: /Farmácia/ })).toContainText(brl(75));
  });

  test("remove uma avulsa e o mês fica vazio", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Saúde");
    await seed.createOneTimeExpense({
      description: "Farmácia",
      amount: 50,
      categoryId: category.id,
      competence: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: /Farmácia/ }).click();
    await ficha(page, "Farmácia").getByRole("button", { name: "Remover" }).click();
    const confirm = page.getByRole("dialog", { name: "Remover despesa?" });
    await expect(confirm).toContainText('Excluir a despesa "Farmácia"?');
    await confirm.getByRole("button", { name: "Remover" }).click();

    await expect(page.getByText("Despesa removida")).toBeVisible();
    await expect(
      page.getByText("Recorrentes e parcelas futuras aparecem aqui automaticamente."),
    ).toBeVisible();
  });

  test("mês passado sem lançamentos não oferece cadastro", async ({ page }) => {
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Mês anterior" }).click();

    await expect(
      page.getByText(/Competências passadas não aceitam novos lançamentos/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Adicionar despesa" })).toHaveCount(0);
  });
});
