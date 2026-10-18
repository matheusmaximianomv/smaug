import type { Page } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test.js";
import { goto } from "../../src/support/ui.js";

/** Entra pela tela de login (a página já precisa estar aberta e hidratada). */
async function entrar(page: Page, email: string, password: string): Promise<void> {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("login", () => {
  test.use({ authenticate: false });

  test("entra com e-mail e senha e chega ao dashboard", async ({ page, seedUser }) => {
    await goto(page, "/login");

    await entrar(page, seedUser.email, seedUser.password);

    await expect(page).toHaveURL(/\/dashboard$/);
    // A sidebar exibe o nome de quem está logado.
    await expect(page.getByText(seedUser.name, { exact: true })).toBeVisible();
  });

  test("senha errada mantém em /login com a mensagem de credenciais", async ({
    page,
    seedUser,
  }) => {
    const renovacoes: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/auth/refresh")) renovacoes.push(request.url());
    });
    await goto(page, "/login");

    await entrar(page, seedUser.email, "senha-que-nao-e-a-dele");

    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    expect(renovacoes).toEqual([]);
  });

  test("e-mail sem conta recebe a mesma mensagem de credenciais", async ({ page }) => {
    await goto(page, "/login");

    await entrar(page, "ninguem-com-este-email@e2e.local", "qualquer-senha-longa");

    await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a sessão persiste após recarregar a página", async ({ page, seedUser }) => {
    await goto(page, "/login");
    await entrar(page, seedUser.email, seedUser.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Receitas" })
      .click();
    await expect(page).toHaveURL(/\/receitas$/);

    await page.reload();

    await expect(page).toHaveURL(/\/receitas$/);
    await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
    await expect(page.getByText(seedUser.name, { exact: true })).toBeVisible();
  });

  test("nenhum script da página enxerga o refresh nem o access token", async ({
    page,
    seedUser,
  }) => {
    await goto(page, "/login");
    await entrar(page, seedUser.email, seedUser.password);
    await expect(page.getByText(seedUser.name, { exact: true })).toBeVisible();

    const visivel = await page.evaluate(() => ({
      cookies: document.cookie,
      local: JSON.stringify({ ...localStorage }),
      session: JSON.stringify({ ...sessionStorage }),
    }));

    expect(visivel.cookies).toContain("smaug_session=1");
    expect(visivel.cookies).not.toContain("smaug_refresh");
    for (const store of [visivel.cookies, visivel.local, visivel.session]) {
      // Um JWT (o access token) começa por `eyJ` — o cabeçalho JSON em base64url.
      expect(store).not.toContain("eyJ");
    }
  });

  test("sair encerra a sessão e o dashboard volta a ser barrado", async ({ page, seedUser }) => {
    await goto(page, "/login");
    await entrar(page, seedUser.email, seedUser.password);
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Sair", exact: true }).click();

    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
  });
});
