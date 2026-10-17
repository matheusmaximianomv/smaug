import { expect, test } from "../../src/fixtures/test.js";
import { monthLong, monthTitle } from "../../src/support/format.js";
import { MONTH_NAMES_SHORT } from "../../src/support/month-names.js";
import { goto, monthStrip } from "../../src/support/ui.js";

test.describe("navegação por competência em Receitas e Despesas", () => {
  test("a faixa e as setas trocam o mês, que sobrevive ao recarregar e à troca de tela", async ({
    page,
    competence,
  }) => {
    const alvo = competence.plus(2);
    await goto(page, "/despesas");
    await expect(page.getByText("Mês atual", { exact: true })).toBeVisible();

    // A faixa mostra o ano do mês selecionado; se +2 cair no ano seguinte, chega-se pelas setas.
    if (alvo.year === competence.current.year) {
      await monthStrip(page)
        .getByRole("button", { name: new RegExp(`^${MONTH_NAMES_SHORT[alvo.month - 1]}`) })
        .click();
    } else {
      await page.getByRole("button", { name: "Próximo mês" }).click();
      await page.getByRole("button", { name: "Próximo mês" }).click();
    }
    await expect(page.getByRole("heading", { name: monthTitle(alvo) })).toBeVisible();
    await expect(page.getByRole("button", { name: "Voltar para o mês atual" })).toBeVisible();

    await page.getByRole("button", { name: "Mês anterior" }).click();
    await expect(page.getByRole("heading", { name: monthTitle(competence.next) })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: monthTitle(competence.next) })).toBeVisible();

    await goto(page, "/receitas");
    await expect(page.getByRole("heading", { name: monthTitle(competence.next) })).toBeVisible();

    await goto(page, "/dashboard");
    await expect(page.getByText(monthLong(competence.current), { exact: true })).toBeVisible();

    await goto(page, "/despesas");
    await page.getByRole("button", { name: "Voltar para o mês atual" }).click();
    await expect(page.getByRole("heading", { name: monthTitle(competence.current) })).toBeVisible();
    await expect(page.getByText("Mês atual", { exact: true })).toBeVisible();
  });

  test("ao passar de dezembro a faixa troca de ano", async ({ page, competence }) => {
    const meses = 12 - competence.current.month + 1;
    await goto(page, "/despesas");

    for (let i = 0; i < meses; i++) await page.getByRole("button", { name: "Próximo mês" }).click();

    const janeiro = { year: competence.current.year + 1, month: 1 };
    await expect(page.getByRole("heading", { name: monthTitle(janeiro) })).toBeVisible();
    await expect(monthStrip(page).getByRole("button", { name: /^Jan/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
