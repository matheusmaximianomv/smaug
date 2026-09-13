import type { Page } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

/** A aba traz o contador no nome acessível ("Fixas 1"), daí o regex. */
async function abrirAbaFixas(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /^Fixas/ }).click();
}

test.describe("receitas fixas", () => {
  test("estado vazio oferece criar a primeira receita fixa", async ({ page }) => {
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await expect(page.getByText("Nenhuma receita fixa cadastrada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Criar primeira receita fixa" })).toBeVisible();
  });

  test("cria uma receita fixa alterável em aberto", async ({ page, competence }) => {
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova receita fixa" }).click();
    const modal = dialog(page);
    await modal.getByPlaceholder("Ex: Salário, aluguel recebido...").fill("Salário");
    await modal.getByLabel("Valor mensal (R$)").fill("4000,00");
    await modal.getByLabel("Modalidade").selectOption("ALTERABLE");
    await fillCompetence(modal, "Início da vigência", competence.current);
    await modal.getByRole("button", { name: "Criar receita fixa" }).click();

    const card = page.getByTestId("fixed-revenue-card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Salário");
    await expect(card).toContainText(`${brl(4000)}/mês`);
    await expect(card.getByText("Fixa", { exact: true })).toBeVisible();
    await expect(card.getByText("Alterável", { exact: true })).toBeVisible();
    await expect(card).toContainText(`Vigência: ${monthShort(competence.current)} → em aberto`);
    await expect(card).toContainText("1 versão");
    await expect(card.getByRole("button", { name: "Nova versão" })).toBeVisible();
  });

  test("receita inalterável não oferece nova versão", async ({ page, competence }) => {
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova receita fixa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Aposentadoria");
    await modal.getByLabel("Valor mensal (R$)").fill("2500");
    await modal.getByLabel("Modalidade").selectOption("UNALTERABLE");
    await fillCompetence(modal, "Início da vigência", competence.current);
    await modal.getByRole("button", { name: "Criar receita fixa" }).click();

    const card = page.getByTestId("fixed-revenue-card");
    await expect(card.getByText("Inalterável", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Nova versão" })).toHaveCount(0);
    // Encerrar continua disponível: é a única alteração permitida.
    await expect(card.getByRole("button", { name: "Encerrar" })).toBeVisible();
  });

  test("cria uma receita fixa com data de término", async ({ page, competence }) => {
    const termino = competence.plus(3);

    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova receita fixa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Bolsa de estudos");
    await modal.getByLabel("Valor mensal (R$)").fill("1200");
    await fillCompetence(modal, "Início da vigência", competence.current);
    await modal.getByLabel("Definir data de término").check();
    await fillCompetence(modal, "Término da vigência", termino);
    await modal.getByRole("button", { name: "Criar receita fixa" }).click();

    await expect(page.getByTestId("fixed-revenue-card")).toContainText(
      `Vigência: ${monthShort(competence.current)} → ${monthShort(termino)}`,
    );
  });

  test("bloqueia início em competência passada", async ({ page, competence }) => {
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova receita fixa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Salário retroativo");
    await modal.getByLabel("Valor mensal (R$)").fill("4000");
    await fillCompetence(modal, "Início da vigência", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Criar receita fixa" }).click();

    await expect(modal.getByText("Início não pode ser em competência passada.")).toBeVisible();
  });

  test("bloqueia término anterior ao início", async ({ page, competence }) => {
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova receita fixa" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Salário");
    await modal.getByLabel("Valor mensal (R$)").fill("4000");
    // Início no mês seguinte e término no vigente: nenhum dos dois é passado,
    // então o único erro possível é a ordem entre eles.
    await fillCompetence(modal, "Início da vigência", competence.next);
    await modal.getByLabel("Definir data de término").check();
    await fillCompetence(modal, "Término da vigência", competence.current);
    await modal.getByRole("button", { name: "Criar receita fixa" }).click();

    await expect(modal.getByText("Término não pode ser anterior ao início.")).toBeVisible();
  });

  test("exclui uma receita fixa após confirmação", async ({ page, seed, competence }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByTestId("fixed-revenue-card").getByRole("button", { name: "Excluir" }).click();

    await expect(
      dialog(page).getByText("Tem certeza que deseja excluir permanentemente esta receita fixa?"),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Nenhuma receita fixa cadastrada.")).toBeVisible();
  });
});
