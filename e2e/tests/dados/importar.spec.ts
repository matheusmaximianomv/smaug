import type { Page } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test.js";
import { goto } from "../../src/support/ui.js";

const HEADER =
  "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao";

function csv(...rows: string[]): Buffer {
  return Buffer.from(`﻿${[HEADER, ...rows].join("\r\n")}\r\n`, "utf8");
}

async function upload(page: Page, buffer: Buffer): Promise<void> {
  await page.getByLabel("Arquivo CSV").setInputFiles({
    name: "lancamentos.csv",
    mimeType: "text/csv",
    buffer,
  });
}

test.describe("dados — importar", () => {
  test("confere o arquivo antes de gravar", async ({ page, competence }) => {
    const competencia = `${competence.current.year}-${String(competence.current.month).padStart(2, "0")}`;
    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await expect(page.getByText(/cria registros novos/)).toBeVisible();

    await upload(page, csv(`${competencia};receita;;Salário;9200,00;avulsa;;;;`));

    await expect(page.getByText("lancamentos.csv")).toBeVisible();
    await expect(page.getByText("Vai entrar")).toBeVisible();
    await expect(page.getByRole("button", { name: "Importar 1 lançamento" })).toBeEnabled();
  });

  test("cria os lançamentos do arquivo", async ({ page, seed, competence }) => {
    const competencia = `${competence.current.year}-${String(competence.current.month).padStart(2, "0")}`;
    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await upload(
      page,
      csv(
        `${competencia};receita;;Salário;9200,00;avulsa;;;;`,
        `${competencia};despesa;Mercado;Feira;80,00;avulsa;;;;`,
      ),
    );
    await page.getByRole("button", { name: "Importar 2 lançamentos" }).click();

    await expect(page.getByRole("heading", { name: "2 registros criados" })).toBeVisible();
    await expect(page.getByText("Categorias criadas")).toBeVisible();

    // A categoria citada por nome foi criada de verdade.
    const categories = await seed.listCategories();
    expect(categories.map((c) => c.name)).toContain("Mercado");

    const revenues = await seed.queryRevenues(competence.current);
    expect(revenues.oneTimeRevenues.map((r) => r.description)).toContain("Salário");
  });

  test("lista as linhas recusadas e importa só as boas", async ({ page, competence }) => {
    const competencia = `${competence.current.year}-${String(competence.current.month).padStart(2, "0")}`;
    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await upload(
      page,
      csv(
        `${competencia};receita;;Salário;9200,00;avulsa;;;;`,
        "abril;receita;;Competência inválida;100,00;avulsa;;;;",
        `${competencia};despesa;;Sem categoria;50,00;avulsa;;;;`,
      ),
    );

    await expect(page.getByText(/2 linhas com problema/)).toBeVisible();
    await expect(page.getByText('Competência "abril" inválida — esperado AAAA-MM')).toBeVisible();
    await expect(page.getByText("Categoria obrigatória em despesas")).toBeVisible();

    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();

    await expect(page.getByRole("heading", { name: "1 registro criado" })).toBeVisible();
  });

  test("importar o mesmo arquivo duas vezes duplica por design", async ({
    page,
    seed,
    competence,
  }) => {
    const competencia = `${competence.current.year}-${String(competence.current.month).padStart(2, "0")}`;
    const file = csv(`${competencia};receita;;Salário;9200,00;avulsa;;;;`);

    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await upload(page, file);
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(page.getByRole("heading", { name: "1 registro criado" })).toBeVisible();

    await page.getByRole("button", { name: "Importar outro arquivo" }).click();
    await upload(page, file);
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
    await expect(page.getByRole("heading", { name: "1 registro criado" })).toBeVisible();

    const revenues = await seed.queryRevenues(competence.current);
    const salarios = revenues.oneTimeRevenues.filter((r) => r.description === "Salário");
    expect(salarios).toHaveLength(2);
  });

  test("agrupa uma série de parcelas numa única compra", async ({ page, seed, competence }) => {
    const first = competence.current;
    const second = competence.next;
    const label = (c: { year: number; month: number }) =>
      `${c.year}-${String(c.month).padStart(2, "0")}`;

    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await upload(
      page,
      csv(
        `${label(first)};despesa;Educação;Notebook;400,00;parcelada;1;2;ser-1;`,
        `${label(second)};despesa;Educação;Notebook;400,00;parcelada;2;2;ser-1;`,
      ),
    );

    await expect(page.getByText("Séries agrupadas")).toBeVisible();
    await page.getByRole("button", { name: "Importar 2 lançamentos" }).click();

    await expect(page.getByRole("heading", { name: "1 registro criado" })).toBeVisible();

    const installments = await seed.listInstallmentExpenses();
    expect(installments).toHaveLength(1);
    expect(installments[0]!.installmentCount).toBe(2);
  });

  test("recusa um arquivo sem as colunas obrigatórias", async ({ page }) => {
    await goto(page, "/dados");
    await page.getByRole("tab", { name: "Importar" }).click();

    await page.getByLabel("Arquivo CSV").setInputFiles({
      name: "errado.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("competencia,natureza,descricao\r\n2026-04,receita,Salário", "utf8"),
    });

    await expect(page.getByText(/ponto e vírgula/)).toBeVisible();
  });

  test("o arquivo exportado volta pela importação", async ({ page, seed, competence }) => {
    await seed.createOneTimeRevenue({
      description: "Freelance",
      amount: 1500,
      competence: competence.current,
    });

    await goto(page, "/dados");
    await expect(page.getByTestId("preview-card")).toContainText("Prévia");

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Baixar CSV" }).click(),
    ]);

    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);

    await page.getByRole("tab", { name: "Importar" }).click();
    await upload(page, Buffer.concat(chunks));
    await page.getByRole("button", { name: "Importar 1 lançamento" }).click();

    await expect(page.getByRole("heading", { name: "1 registro criado" })).toBeVisible();

    const revenues = await seed.queryRevenues(competence.current);
    expect(revenues.oneTimeRevenues.filter((r) => r.description === "Freelance")).toHaveLength(2);
  });
});
