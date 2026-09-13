import { cenarioCategoriaComVinculo } from "../../src/fixtures/scenarios.js";
import { expect, test } from "../../src/fixtures/test.js";
import { dialog, goto } from "../../src/support/ui.js";

test.describe("categorias", () => {
  test("estado vazio oferece criar a primeira categoria", async ({ page }) => {
    await goto(page, "/categorias");

    await expect(page.getByText("Nenhuma categoria cadastrada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Criar primeira categoria" })).toBeVisible();
  });

  test("cria uma categoria e ela aparece sem despesas vinculadas", async ({ page }) => {
    await goto(page, "/categorias");

    await page.getByRole("button", { name: "Nova categoria" }).click();
    await dialog(page).getByLabel("Nome da categoria").fill("Moradia");
    await dialog(page).getByRole("button", { name: "Criar categoria" }).click();

    const card = page.getByTestId("category-card");
    await expect(card).toHaveCount(1);
    await expect(card).toContainText("Moradia");
    await expect(card).toContainText("0 despesas vinculadas");
    // Avatar da categoria: primeira letra em maiúscula.
    await expect(card.getByText("M", { exact: true })).toBeVisible();
  });

  test("recusa nome duplicado", async ({ page, seed }) => {
    await seed.createCategory("Moradia");
    await goto(page, "/categorias");

    await page.getByRole("button", { name: "Nova categoria" }).click();
    await dialog(page).getByLabel("Nome da categoria").fill("Moradia");
    await dialog(page).getByRole("button", { name: "Criar categoria" }).click();

    await expect(page.getByText("Já existe uma categoria com este nome.")).toBeVisible();
    await expect(page.getByTestId("category-card")).toHaveCount(1);
  });

  test("edita o nome de uma categoria", async ({ page, seed }) => {
    await seed.createCategory("Moradia");
    await goto(page, "/categorias");

    await page.getByRole("button", { name: "Editar categoria" }).click();
    await dialog(page).getByLabel("Nome da categoria").fill("Casa");
    await dialog(page).getByRole("button", { name: "Salvar" }).click();

    await expect(page.getByTestId("category-card")).toContainText("Casa");
  });

  test("exclui categoria sem despesas vinculadas", async ({ page, seed }) => {
    await seed.createCategory("Lazer");
    await goto(page, "/categorias");

    await page.getByRole("button", { name: "Excluir categoria" }).click();

    await expect(
      dialog(page).getByText('Tem certeza que deseja excluir a categoria "Lazer"?'),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Excluir" }).click();

    await expect(page.getByTestId("category-card")).toHaveCount(0);
    await expect(page.getByText("Nenhuma categoria cadastrada.")).toBeVisible();
  });

  test("bloqueia a exclusão de categoria com despesas vinculadas", async ({
    page,
    seed,
    competence,
  }) => {
    const { category } = await cenarioCategoriaComVinculo(seed, competence);
    await goto(page, "/categorias");

    const card = page.getByTestId("category-card");
    await expect(card).toContainText("1 despesa vinculada");

    await page.getByRole("button", { name: "Excluir categoria" }).click();

    await expect(dialog(page).getByText("Não é possível excluir")).toBeVisible();
    await expect(dialog(page)).toContainText(category.name);
    await dialog(page).getByRole("button", { name: "Entendido" }).click();

    // A categoria continua lá: o modal é só aviso, não confirmação.
    await expect(card).toHaveCount(1);
    await expect(card).toContainText(category.name);
  });

  test("a proteção contra exclusão também existe no servidor", async ({ seed, competence }) => {
    const { category } = await cenarioCategoriaComVinculo(seed, competence);

    const response = await seed.deleteCategoryRaw(category.id);

    expect(response.status()).toBe(409);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("EXPENSE_CATEGORY_HAS_LINKED_EXPENSES");
  });

  test("o contador de vínculos sobe ao criar despesa na categoria", async ({
    page,
    seed,
    competence,
  }) => {
    const category = await seed.createCategory("Alimentação");
    await goto(page, "/categorias");
    await expect(page.getByTestId("category-card")).toContainText("0 despesas vinculadas");

    await seed.createOneTimeExpense({
      description: "Padaria",
      amount: 42,
      categoryId: category.id,
      competence: competence.current,
    });
    await page.reload();

    await expect(page.getByTestId("category-card")).toContainText("1 despesa vinculada");
  });
});
