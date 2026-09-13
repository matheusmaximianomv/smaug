import type { Page } from "@playwright/test";
import { cenarioReceitaFixaVersionada } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthLong, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto, panel } from "../../src/support/ui.js";

async function abrirAbaFixas(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /^Fixas/ }).click();
}

test.describe("versionamento de receita fixa", () => {
  test("adiciona versão futura sem mudar o valor vigente hoje", async ({
    page,
    seed,
    competence,
  }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Salário reajustado");
    await modal.getByLabel("Novo valor (R$)").fill("4800");
    await fillCompetence(modal, "Vigência a partir de", competence.next);
    await modal.getByRole("button", { name: "Criar nova versão" }).click();

    const card = page.getByTestId("fixed-revenue-card");
    await expect(card).toContainText("2 versões");
    // A versão vigente HOJE continua sendo a primeira.
    await expect(card).toContainText(`${brl(4000)}/mês`);
    await expect(card).toContainText("Salário");
  });

  test("o histórico lista as versões da mais recente para a mais antiga", async ({
    page,
    seed,
    competence,
  }) => {
    const cenario = await cenarioReceitaFixaVersionada(seed, competence);
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Ver histórico" }).click();

    const modal = dialog(page);
    await expect(modal.getByText("Histórico de versões")).toBeVisible();
    await expect(modal.getByText(/^A partir de /)).toHaveText([
      `A partir de ${monthShort(competence.next)}`,
      `A partir de ${monthShort(competence.current)}`,
    ]);
    await expect(modal).toContainText(`${brl(cenario.segunda.amount)}/mês`);
    await expect(modal).toContainText(`${brl(cenario.primeira.amount)}/mês`);

    await modal.getByRole("button", { name: "Fechar" }).click();
    await expect(modal).toBeHidden();
  });

  test("bloqueia vigência em mês passado", async ({ page, seed, competence }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Salário retroativo");
    await modal.getByLabel("Novo valor (R$)").fill("4800");
    await fillCompetence(modal, "Vigência a partir de", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Criar nova versão" }).click();

    await expect(modal.getByText("A vigência não pode começar em mês passado.")).toBeVisible();
  });

  test("recusa duas versões vigentes no mesmo mês", async ({ page, seed, competence }) => {
    await cenarioReceitaFixaVersionada(seed, competence);
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Salário conflitante");
    await modal.getByLabel("Novo valor (R$)").fill("5000");
    await fillCompetence(modal, "Vigência a partir de", competence.next);
    await modal.getByRole("button", { name: "Criar nova versão" }).click();

    await expect(page.getByText("Já existe uma versão vigente a partir deste mês.")).toBeVisible();
    await expect(page.getByTestId("fixed-revenue-card")).toContainText("2 versões");
  });

  test("encerra a receita fixa no mês escolhido", async ({ page, seed, competence }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    await page.getByRole("button", { name: "Encerrar" }).click();
    const modal = dialog(page);
    await fillCompetence(modal, "Mês de encerramento", competence.current);
    await modal.getByRole("button", { name: "Encerrar receita" }).click();

    await expect(page.getByTestId("fixed-revenue-card")).toContainText(
      `Vigência: ${monthShort(competence.current)} → ${monthShort(competence.current)}`,
    );
  });

  // ⏱ O badge "Encerrada" é calculado no cliente: só aparece quando o relógio
  // do browser passa do mês de encerramento.
  test("receita encerrada no mês passado aparece como encerrada", async ({
    page,
    seed,
    competence,
    shiftClock,
  }) => {
    await seed.createFixedRevenue({
      description: "Bolsa temporária",
      amount: 900,
      modality: "ALTERABLE",
      start: competence.current,
      end: competence.current,
    });

    await shiftClock(1);
    await goto(page, "/receitas");
    await abrirAbaFixas(page);

    const card = page.getByTestId("fixed-revenue-card");
    await expect(card.getByText("Encerrada", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Nova versão" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Ver histórico" })).toBeVisible();
  });

  test("o dashboard do mês seguinte reflete a nova versão", async ({ page, seed, competence }) => {
    const cenario = await cenarioReceitaFixaVersionada(seed, competence);
    await goto(page, "/dashboard");

    const receitas = panel(page, "Receitas do período");
    await expect(receitas).toContainText(cenario.primeira.description);
    await expect(receitas).toContainText(brl(cenario.primeira.amount));

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByText(monthLong(competence.next))).toBeVisible();

    await expect(receitas).toContainText(cenario.segunda.description);
    await expect(receitas).toContainText(brl(cenario.segunda.amount));
  });
});
