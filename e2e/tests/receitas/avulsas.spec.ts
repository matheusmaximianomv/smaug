import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthTitle } from "../../src/support/format.js";
import { dialog, ficha, goto } from "../../src/support/ui.js";

test.describe("receitas avulsas", () => {
  test("cria uma avulsa pelo assistente e ela entra no grupo e no total", async ({
    page,
    seed,
    competence,
  }) => {
    await goto(page, "/receitas");
    await expect(page.getByRole("heading", { name: monthTitle(competence.current) })).toBeVisible();

    await page.getByRole("button", { name: "Nova receita" }).click();
    await expect(dialog(page)).toContainText("Essa receita entra uma vez ou durante um período?");
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByLabel("Descrição").fill("Freelance");
    await dialog(page)
      .getByLabel(/^Valor/)
      .fill("800");
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByRole("button", { name: "Confirmar receita" }).click();

    await expect(page.getByText("Receita adicionada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Avulsas" })).toContainText("Freelance");
    await expect(page.getByRole("region", { name: "Resumo do mês" })).toContainText(brl(800));
    const { oneTimeRevenues } = await seed.queryRevenues(competence.current);
    expect(oneTimeRevenues.map((r) => r.amount)).toEqual([800]);
  });

  test("edita e remove uma avulsa do mês corrente", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Bônus",
      amount: 300,
      competence: competence.current,
    });
    await goto(page, "/receitas");

    await page.getByRole("button", { name: /Bônus/ }).click();
    await ficha(page, "Bônus").getByRole("button", { name: "Editar" }).click();
    await dialog(page)
      .getByLabel(/^Valor/)
      .fill("350");
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await dialog(page).getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Receita atualizada")).toBeVisible();
    await expect(page.getByRole("button", { name: /Bônus/ })).toContainText(brl(350));

    await page.getByRole("button", { name: /Bônus/ }).click();
    await ficha(page, "Bônus").getByRole("button", { name: "Remover" }).click();
    await page
      .getByRole("dialog", { name: "Remover receita?" })
      .getByRole("button", { name: "Remover" })
      .click();

    await expect(page.getByText("Receita removida")).toBeVisible();
    await expect(page.getByText("Receitas fixas aparecem aqui automaticamente.")).toBeVisible();
  });
});
