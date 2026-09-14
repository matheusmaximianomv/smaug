import type { Download } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test.js";
import { goto } from "../../src/support/ui.js";

const BOM = "﻿";
const HEADER =
  "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao";

/** Lê o arquivo baixado como texto, preservando BOM e CRLF. */
async function readDownload(download: Download): Promise<string> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

test.describe("dados — exportar", () => {
  test("a área de dados aparece na navegação", async ({ page }) => {
    await goto(page, "/dashboard");

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Dados" })
      .click();

    await expect(page.getByRole("heading", { name: "Dados" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Exportar" })).toBeVisible();
  });

  test("a prévia conta os lançamentos do mês vigente", async ({ page, seed, competence }) => {
    const moradia = await seed.createCategory("Moradia");
    await seed.createOneTimeRevenue({
      description: "Freelance",
      amount: 1500,
      competence: competence.current,
    });
    await seed.createOneTimeExpense({
      categoryId: moradia.id,
      description: "Condomínio",
      amount: 700,
      competence: competence.current,
    });

    await goto(page, "/dados");

    // Escopado no card: o nome do usuário na sidebar vem do título do teste e também
    // casaria com "prévia" numa busca por texto solta.
    const preview = page.getByTestId("preview-card");
    await expect(preview).toContainText("Prévia");
    await expect(preview).toContainText("2");
    await expect(preview).toContainText("lançamentos");
  });

  test("baixa um CSV com os lançamentos do período", async ({ page, seed, competence }) => {
    const moradia = await seed.createCategory("Moradia");
    await seed.createOneTimeRevenue({
      description: "Freelance",
      amount: 1500,
      competence: competence.current,
    });
    await seed.createOneTimeExpense({
      categoryId: moradia.id,
      description: "Condomínio",
      amount: 700,
      competence: competence.current,
    });

    await goto(page, "/dados");
    await expect(page.getByTestId("preview-card")).toContainText("2");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^smaug-lancamentos-\d{4}-\d{2}-\d{2}\.csv$/);

    const content = await readDownload(download);
    const competencia = `${competence.current.year}-${String(competence.current.month).padStart(2, "0")}`;

    expect(content.startsWith(BOM)).toBe(true);
    expect(content).toContain(HEADER);
    expect(content).toContain(`${competencia};receita;;Freelance;1500,00;avulsa;;;;`);
    expect(content).toContain(`${competencia};despesa;Moradia;Condomínio;700,00;avulsa;;;;`);
    // Receita antes de despesa, conforme a ordenação da especificação.
    expect(content.indexOf("Freelance")).toBeLessThan(content.indexOf("Condomínio"));
  });

  test("exporta a base completa sem escolher período", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Bônus futuro",
      amount: 300,
      competence: competence.in2,
    });

    await goto(page, "/dados");
    await page.getByRole("radio", { name: "Base completa" }).click();

    await expect(page.getByText(/Exporta tudo que existe, sem filtro/)).toBeVisible();

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar CSV" }).click(),
    ]);

    expect(await readDownload(download)).toContain("Bônus futuro");
  });

  test("barra período invertido antes de chamar a API", async ({ page }) => {
    await goto(page, "/dados");

    const desde = page.getByLabel("De — mês");
    const ate = page.getByLabel("Até — mês");
    await desde.selectOption("6");
    await ate.selectOption("3");

    await expect(page.getByText("O mês final é anterior ao inicial.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Baixar CSV" })).toBeDisabled();
  });
});
