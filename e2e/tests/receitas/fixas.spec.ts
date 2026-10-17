import { expect, test } from "../../src/fixtures/test.js";
import { monthShort } from "../../src/support/format.js";
import { dialog, ficha, goto } from "../../src/support/ui.js";

test.describe("receitas fixas", () => {
  test("cria uma fixa com vigência padrão de 12 meses e modalidade Alterável", async ({
    page,
    seed,
    competence,
  }) => {
    await goto(page, "/receitas");

    await page.getByRole("button", { name: "Nova receita" }).click();
    await dialog(page).getByRole("radio", { name: /Fixa/ }).click();
    await dialog(page).getByRole("button", { name: "Continuar" }).click();
    await expect(dialog(page).getByLabel(/Fim da vigência/)).toHaveValue(
      `${competence.plus(11).year}-${competence.plus(11).month}`,
    );
    await expect(dialog(page).getByRole("radio", { name: /pode mudar/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await dialog(page).getByLabel("Descrição").fill("Salário");
    await dialog(page)
      .getByLabel(/Valor mensal/)
      .fill("5000");
    await dialog(page).getByRole("button", { name: "Continuar" }).click();

    await expect(dialog(page)).toContainText(
      `${monthShort(competence.current)} a ${monthShort(competence.plus(11))}`,
    );
    await dialog(page).getByRole("button", { name: "Confirmar receita" }).click();

    await expect(page.getByText("Receita fixa criada")).toBeVisible();
    await expect(page.getByRole("region", { name: "Fixas" })).toContainText(
      `Alterável · desde ${monthShort(competence.current)} · até ${monthShort(competence.plus(11))}`,
    );
    const [fixa] = await seed.listFixedRevenues();
    expect(fixa).toMatchObject({ modality: "ALTERABLE", endMonth: competence.plus(11).month });
  });

  test("a Ficha de uma fixa inalterável não oferece Nova versão", async ({
    page,
    seed,
    competence,
  }) => {
    await seed.createFixedRevenue({
      description: "Aluguel recebido",
      amount: 1200,
      modality: "UNALTERABLE",
      start: competence.current,
    });
    await goto(page, "/receitas");

    await page.getByRole("button", { name: /Aluguel recebido/ }).click();
    const aluguel = ficha(page, "Aluguel recebido");

    await expect(aluguel.getByRole("tab", { name: "Linha do tempo" })).toBeVisible();
    await expect(aluguel.getByRole("button", { name: "Nova versão" })).toHaveCount(0);
    await expect(aluguel.getByRole("button", { name: "Encerrar" })).toBeVisible();
    await expect(aluguel).toContainText(
      "Receita inalterável: o valor fica igual até o encerramento. Por isso não há Nova versão.",
    );
  });
});
