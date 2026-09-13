import {
  cenarioHistoricoMisto,
  cenarioReceitaFixaVersionada,
} from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort } from "../../src/support/format.js";
import { dialog, fillCompetence, goto } from "../../src/support/ui.js";

test.describe("histórico de versões", () => {
  test("usuário sem versões vê o estado vazio", async ({ page }) => {
    await goto(page, "/historico");

    await expect(page.getByText("Nenhum histórico de versões encontrado.")).toBeVisible();
  });

  test("agrupa por mês de vigência em ordem decrescente", async ({ page, seed, competence }) => {
    await cenarioHistoricoMisto(seed, competence);
    await goto(page, "/historico");

    const grupoRecente = page.getByText(monthShort(competence.next), { exact: true });
    const grupoAntigo = page.getByText(monthShort(competence.current), { exact: true });
    await expect(grupoRecente).toBeVisible();
    await expect(grupoAntigo).toBeVisible();

    const recente = await grupoRecente.boundingBox();
    const antigo = await grupoAntigo.boundingBox();
    expect(recente!.y).toBeLessThan(antigo!.y);
  });

  test("mostra tipo, modalidade e categoria de cada versão", async ({ page, seed, competence }) => {
    const cenario = await cenarioHistoricoMisto(seed, competence);
    await goto(page, "/historico");

    await expect(page.getByText("Receita Fixa")).toHaveCount(2);
    await expect(page.getByText("Despesa Recorrente")).toHaveCount(2);
    await expect(page.getByText("Alterável", { exact: true })).toHaveCount(2);
    await expect(page.getByText(cenario.recorrente.categories.original.name)).toHaveCount(1);
    await expect(page.getByText(cenario.recorrente.categories.nova.name)).toHaveCount(1);
  });

  test("usa sinal positivo para receita e negativo para despesa", async ({
    page,
    seed,
    competence,
  }) => {
    const cenario = await cenarioHistoricoMisto(seed, competence);
    const versaoRecorrente = cenario.recorrente.atualizada.versions.find(
      (v) => v.effectiveYear === competence.next.year && v.effectiveMonth === competence.next.month,
    )!;

    await goto(page, "/historico");

    await expect(page.getByText(`+${brl(cenario.fixa.segunda.amount)}`)).toBeVisible();
    await expect(page.getByText(`+${brl(cenario.fixa.primeira.amount)}`)).toBeVisible();
    await expect(page.getByText(`-${brl(versaoRecorrente.amount)}`)).toBeVisible();
    // Uma marcação "/mês" por versão listada.
    await expect(page.getByText("/mês")).toHaveCount(4);
  });

  test("o filtro de receitas fixas esconde as recorrentes", async ({ page, seed, competence }) => {
    const cenario = await cenarioHistoricoMisto(seed, competence);
    await goto(page, "/historico");

    await page.getByRole("button", { name: "Receitas Fixas" }).click();

    await expect(page.getByText("Receita Fixa")).toHaveCount(2);
    await expect(page.getByText("Despesa Recorrente")).toHaveCount(0);
    await expect(page.getByText(cenario.fixa.segunda.description)).toBeVisible();
  });

  test("o filtro de despesas recorrentes esconde as fixas", async ({ page, seed, competence }) => {
    await cenarioHistoricoMisto(seed, competence);
    await goto(page, "/historico");

    await page.getByRole("button", { name: "Despesas Recorrentes" }).click();

    await expect(page.getByText("Despesa Recorrente")).toHaveCount(2);
    await expect(page.getByText("Receita Fixa")).toHaveCount(0);
  });

  test("o filtro “Todos” restaura a lista inteira", async ({ page, seed, competence }) => {
    await cenarioHistoricoMisto(seed, competence);
    await goto(page, "/historico");

    await page.getByRole("button", { name: "Receitas Fixas" }).click();
    await expect(page.getByText("Despesa Recorrente")).toHaveCount(0);

    await page.getByRole("button", { name: "Todos" }).click();

    await expect(page.getByText("Receita Fixa")).toHaveCount(2);
    await expect(page.getByText("Despesa Recorrente")).toHaveCount(2);
  });

  test("filtro sem resultado cai no estado vazio", async ({ page, seed, competence }) => {
    await cenarioReceitaFixaVersionada(seed, competence);
    await goto(page, "/historico");

    await page.getByRole("button", { name: "Despesas Recorrentes" }).click();

    await expect(page.getByText("Nenhum histórico de versões encontrado.")).toBeVisible();
  });

  test("versão criada pela UI aparece no histórico", async ({ page, seed, competence }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });

    await goto(page, "/receitas");
    await page.getByRole("tab", { name: /^Fixas/ }).click();
    await page.getByRole("button", { name: "Nova versão" }).click();
    const modal = dialog(page);
    await modal.getByLabel("Nova descrição").fill("Salário com reajuste anual");
    await modal.getByLabel("Novo valor (R$)").fill("4600");
    await fillCompetence(modal, "Vigência a partir de", competence.next);
    await modal.getByRole("button", { name: "Criar nova versão" }).click();
    await expect(page.getByTestId("fixed-revenue-card")).toContainText("2 versões");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Histórico" })
      .click();

    await expect(page).toHaveURL(/\/historico$/);
    await expect(page.getByText("Salário com reajuste anual")).toBeVisible();
    await expect(page.getByText(`+${brl(4600)}`)).toBeVisible();
    await expect(page.getByText(monthShort(competence.next), { exact: true })).toBeVisible();
  });
});
