import { cenarioReceitaFixaVersionada } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort, monthTitle } from "../../src/support/format.js";
import { ficha, goto } from "../../src/support/ui.js";

test.describe("receitas fixas — versionamento", () => {
  test("cria nova versão pela Ficha e o histórico passa a ter duas", async ({
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

    await page.getByRole("button", { name: /Salário/ }).click();
    const salario = ficha(page, "Salário");
    await salario.getByRole("button", { name: "Nova versão" }).click();
    await salario.getByLabel(/Novo valor mensal/).fill("4.800,00");
    await salario.getByRole("button", { name: "Criar nova versão" }).click();

    await expect(page.getByText("Nova versão criada")).toBeVisible();
    await salario.getByRole("tab", { name: "Histórico (2)" }).click();
    const historico = salario
      .getByRole("list", { name: "Histórico de versões" })
      .getByRole("listitem");
    await expect(historico.nth(0)).toContainText(`A partir de ${monthShort(competence.next)}`);
    await expect(historico.nth(0)).toContainText(`${brl(4800)}/mês`);
    await expect(historico.nth(1)).toContainText("Vigente");
  });

  test("o mês do reajuste mostra o valor anterior e a linha do tempo destaca a mudança", async ({
    page,
    seed,
    competence,
  }) => {
    const { primeira, segunda } = await cenarioReceitaFixaVersionada(seed, competence);
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("heading", { name: monthTitle(competence.next) })).toBeVisible();
    await expect(page.getByRole("button", { name: /Salário reajustado/ })).toContainText(
      `reajuste · era ${brl(primeira.amount)}`,
    );

    await page.getByRole("button", { name: /Salário reajustado/ }).click();
    const chips = ficha(page, "Salário")
      .getByRole("list", { name: "Versões" })
      .getByRole("listitem");
    await expect(chips).toHaveCount(2);
    await expect(chips.nth(1)).toContainText(brl(segunda.amount));
    await expect(chips.nth(0)).toContainText("Vigente");
  });

  test("encerra a fixa e ela some dos meses seguintes", async ({ page, seed, competence }) => {
    await seed.createFixedRevenue({
      description: "Salário",
      amount: 4000,
      modality: "ALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");

    await page.getByRole("button", { name: /Salário/ }).click();
    const salario = ficha(page, "Salário");
    await salario.getByRole("button", { name: "Encerrar" }).click();
    await salario.getByRole("button", { name: "Encerrar receita" }).click();

    await expect(page.getByText("Receita encerrada")).toBeVisible();
    await salario.getByRole("button", { name: "Fechar" }).first().click();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByText("Receitas fixas aparecem aqui automaticamente.")).toBeVisible();
  });
});
