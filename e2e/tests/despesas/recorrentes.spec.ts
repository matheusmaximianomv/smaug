import type { Page } from "@playwright/test";
import { cenarioRecorrenteVersionada } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

async function abrirAbaRecorrentes(page: Page): Promise<void> {
  await page.getByRole("tab", { name: /^Recorrentes/ }).click();
}

test.describe("despesas recorrentes", () => {
  test("estado vazio oferece criar a primeira recorrente", async ({ page }) => {
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await expect(page.getByText("Nenhuma despesa recorrente cadastrada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Criar recorrente" })).toBeVisible();
  });

  test("cria uma despesa recorrente em aberto", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Moradia");
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Nova despesa recorrente" }).click();
    const modal = dialog(page);
    await modal.getByPlaceholder("Ex: Aluguel, plano de saúde...").fill("Aluguel");
    await modal.getByLabel("Valor mensal (R$)").fill("1200,00");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Início da vigência", competence.current);
    await modal.getByRole("button", { name: "Criar despesa recorrente" }).click();

    const card = page.getByTestId("recurring-expense-card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Aluguel");
    await expect(card).toContainText(`${brl(1200)}/mês`);
    await expect(card.getByText("Recorrente", { exact: true })).toBeVisible();
    await expect(card).toContainText(category.name);
    await expect(card).toContainText(`Vigência: ${monthShort(competence.current)} → em aberto`);
    await expect(card).toContainText("1 versão");
  });

  test("nova versão troca valor e categoria, preservando o histórico", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Moradia");
    const outra = await seed.createCategory("Serviços");
    await seed.createRecurringExpense({
      description: "Aluguel",
      amount: 1200,
      categoryId: category.id,
      start: competence.current,
    });
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Aluguel reajustado");
    await modal.getByLabel("Novo valor (R$)").fill("1350");
    await modal.getByLabel("Categoria").selectOption({ label: outra.name });
    await fillCompetence(modal, "Vigência a partir de", competence.next);
    await modal.getByRole("button", { name: "Criar nova versão" }).click();

    const card = page.getByTestId("recurring-expense-card");
    await expect(card).toContainText("2 versões");

    await card.getByRole("button", { name: "Ver histórico" }).click();
    const historico = dialog(page);
    await expect(historico.getByText("Histórico de versões")).toBeVisible();
    await expect(historico.getByText(/^A partir de /)).toHaveText([
      `A partir de ${monthShort(competence.next)}`,
      `A partir de ${monthShort(competence.current)}`,
    ]);
    await expect(historico).toContainText(`${brl(1350)}/mês`);
    await expect(historico).toContainText(`${brl(1200)}/mês`);
    await expect(historico).toContainText(outra.name);
    await expect(historico).toContainText(category.name);
  });

  test("exige uma categoria", async ({ page, seed, competence }) => {
    await seed.createCategory("Moradia");
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Nova despesa recorrente" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Aluguel");
    await modal.getByLabel("Valor mensal (R$)").fill("1200");
    await fillCompetence(modal, "Início da vigência", competence.current);
    await modal.getByRole("button", { name: "Criar despesa recorrente" }).click();

    await expect(modal.getByText("Selecione uma categoria.")).toBeVisible();
  });

  test("bloqueia vigência da nova versão em mês passado", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Moradia");
    await seed.createRecurringExpense({
      description: "Aluguel",
      amount: 1200,
      categoryId: category.id,
      start: competence.current,
    });
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Aluguel retroativo");
    await modal.getByLabel("Novo valor (R$)").fill("1350");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Vigência a partir de", {
      year: competence.current.year - 1,
      month: competence.current.month,
    });
    await modal.getByRole("button", { name: "Criar nova versão" }).click();

    await expect(modal.getByText("A vigência não pode começar em mês passado.")).toBeVisible();
  });

  test("bloqueia término anterior ao início", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Moradia");
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Nova despesa recorrente" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Descrição").fill("Aluguel");
    await modal.getByLabel("Valor mensal (R$)").fill("1200");
    await modal.getByLabel("Categoria").selectOption({ label: category.name });
    await fillCompetence(modal, "Início da vigência", competence.next);
    await modal.getByLabel("Definir data de término").check();
    await fillCompetence(modal, "Término", competence.current);
    await modal.getByRole("button", { name: "Criar despesa recorrente" }).click();

    await expect(modal.getByText("Término não pode ser anterior ao início.")).toBeVisible();
  });

  test("encerra a despesa recorrente no mês escolhido", async ({ page, seed, competence }) => {
    const category = await seed.createCategory("Moradia");
    await seed.createRecurringExpense({
      description: "Aluguel",
      amount: 1200,
      categoryId: category.id,
      start: competence.current,
    });
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page.getByRole("button", { name: "Encerrar" }).click();
    const modal = dialog(page);
    await fillCompetence(modal, "Mês de encerramento", competence.current);
    await modal.getByRole("button", { name: "Encerrar despesa" }).click();

    await expect(page.getByTestId("recurring-expense-card")).toContainText(
      `Vigência: ${monthShort(competence.current)} → ${monthShort(competence.current)}`,
    );
  });

  // ⏱ "Encerrada" depende do relógio do cliente passar do mês de encerramento.
  test("recorrente encerrada no mês passado aparece como encerrada", async ({
    page,
    seed,
    competence,
    shiftClock,
  }) => {
    const category = await seed.createCategory("Moradia");
    await seed.createRecurringExpense({
      description: "Streaming",
      amount: 40,
      categoryId: category.id,
      start: competence.current,
      end: competence.current,
    });

    await shiftClock(1);
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    const card = page.getByTestId("recurring-expense-card");
    await expect(card.getByText("Encerrada", { exact: true })).toBeVisible();
    await expect(card.getByRole("button", { name: "Nova versão" })).toHaveCount(0);
    await expect(card.getByRole("button", { name: "Encerrar" })).toHaveCount(0);
  });

  test("exclui a despesa recorrente após confirmação", async ({ page, seed, competence }) => {
    await cenarioRecorrenteVersionada(seed, competence);
    await goto(page, "/despesas");
    await abrirAbaRecorrentes(page);

    await page
      .getByTestId("recurring-expense-card")
      .getByRole("button", { name: "Excluir" })
      .click();

    await expect(dialog(page).getByText("Excluir a despesa recorrente?")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByText("Nenhuma despesa recorrente cadastrada.")).toBeVisible();
  });
});
