import { randomUUID } from "node:crypto";
import { expect, test } from "../../src/fixtures/test.js";
import { goto, waitForHydration } from "../../src/support/ui.js";

test.describe("login", () => {
  test.use({ authenticate: false });

  test("entra com o ID do usuário e chega ao dashboard", async ({ page, seedUser }) => {
    await goto(page, "/login");

    await page.getByLabel("ID do Usuário").fill(seedUser.id);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    // A sidebar exibe o nome de quem está logado.
    await expect(page.getByText(seedUser.name, { exact: true })).toBeVisible();
  });

  test("rejeita ID malformado sem chamar a API", async ({ page }) => {
    const userRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/users")) userRequests.push(request.url());
    });

    await goto(page, "/login");
    await page.getByLabel("ID do Usuário").fill("nao-e-um-uuid");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByText("ID de usuário inválido")).toBeVisible();
    expect(userRequests).toEqual([]);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("informa quando o UUID não corresponde a nenhum usuário", async ({ page }) => {
    await goto(page, "/login");

    await page.getByLabel("ID do Usuário").fill(randomUUID());
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(
      page.getByText("Usuário não encontrado. Verifique o ID e tente novamente."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a sessão persiste após recarregar a página", async ({ page, seedUser }) => {
    await goto(page, "/login");
    await page.getByLabel("ID do Usuário").fill(seedUser.id);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Receitas" })
      .click();
    await expect(page).toHaveURL(/\/receitas$/);

    await page.reload();

    await expect(page).toHaveURL(/\/receitas$/);
    await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
  });

  test("sair encerra a sessão e o dashboard volta a ser barrado", async ({ page, seedUser }) => {
    await goto(page, "/login");
    await page.getByLabel("ID do Usuário").fill(seedUser.id);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Sair" }).click();

    await expect(page).toHaveURL(/\/login$/);

    await goto(page, "/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });
});
