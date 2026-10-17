import { expect, test } from "../../src/fixtures/test.js";
import { brl, monthShort, monthTitle } from "../../src/support/format.js";
import { dialog, ficha, goto } from "../../src/support/ui.js";

test.describe("despesas recorrentes", () => {
  test("cria uma recorrente sem término pelo assistente", async ({ page, seed, competence }) => {
    await seed.createCategory("Lazer");
    await goto(page, "/despesas");

    await page.getByRole("button", { name: "Nova despesa" }).click();
    await dialog(page)
      .getByRole("radio", { name: /Recorrente/ })
      .click();
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await expect(dialog(page).getByLabel("Termina em")).toBeDisabled();
    await dialog(page).getByLabel("Descrição").fill("Academia");
    await dialog(page)
      .getByLabel(/Valor mensal/)
      .fill("89,90");
    await dialog(page).getByLabel("Categoria").selectOption({ label: "Lazer" });
    await dialog(page).getByRole("button", { name: "Continuar" }).click();

    await expect(dialog(page)).toContainText(
      `desde ${monthShort(competence.current)}, sem término`,
    );
    await expect(dialog(page).getByText("continua…")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Confirmar despesa" }).click();

    await expect(page.getByText("Despesa recorrente criada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Recorrentes" })).toContainText(
      `Lazer · desde ${monthShort(competence.current)} · sem término`,
    );
  });

  test("nova versão: o mês em que entra em vigor mostra o selo de reajuste", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Moradia");
    await seed.createRecurringExpense({
      description: "Aluguel",
      amount: 100,
      categoryId: category.id,
      start: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: /Aluguel/ }).click();
    const aluguel = ficha(page, "Aluguel");
    await aluguel.getByRole("button", { name: "Nova versão" }).click();
    await expect(aluguel.getByLabel(/Vigência a partir de/)).toHaveValue(
      `${competence.next.year}-${competence.next.month}`,
    );
    await aluguel.getByLabel(/Novo valor mensal/).fill("130");
    await expect(aluguel.getByRole("list", { name: "Prévia" })).toContainText("130,00");
    await aluguel.getByRole("button", { name: "Criar nova versão" }).click();

    await expect(page.getByText("Nova versão criada")).toBeVisible();
    await expect(aluguel.getByRole("tab", { name: "Histórico (2)" })).toBeVisible();
    await aluguel.getByRole("button", { name: "Fechar" }).first().click();

    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("heading", { name: monthTitle(competence.next) })).toBeVisible();
    await expect(page.getByRole("button", { name: /Aluguel/ })).toContainText(
      `reajuste · era ${brl(100)}`,
    );
  });

  test("encerrar hachura na prévia os mesmos meses que deixam de listar a série", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Lazer");
    await seed.createRecurringExpense({
      description: "Streaming",
      amount: 40,
      categoryId: category.id,
      start: competence.current,
    });
    await goto(page, "/despesas");

    await page.getByRole("button", { name: /Streaming/ }).click();
    const streaming = ficha(page, "Streaming");
    await streaming.getByRole("button", { name: "Encerrar" }).click();
    await streaming
      .getByLabel(/Mês de encerramento/)
      .selectOption(`${competence.next.year}-${competence.next.month}`);

    const previa = streaming.getByRole("list", { name: "Prévia" }).getByRole("listitem");
    await expect(previa.filter({ hasText: monthShort(competence.next) })).not.toContainText(
      "deixa de existir",
    );
    await expect(previa.filter({ hasText: monthShort(competence.in2) })).toContainText(
      "deixa de existir",
    );
    await streaming.getByRole("button", { name: "Encerrar despesa" }).click();

    await expect(page.getByText("Despesa encerrada")).toBeVisible();
    await streaming.getByRole("button", { name: "Fechar" }).first().click();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("button", { name: /Streaming/ })).toBeVisible();
    await page.getByRole("button", { name: "Próximo mês" }).click();
    await expect(page.getByRole("heading", { name: monthTitle(competence.in2) })).toBeVisible();
    await expect(page.getByRole("button", { name: /Streaming/ })).toHaveCount(0);
  });
});
