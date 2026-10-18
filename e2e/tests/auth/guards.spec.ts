import type { BrowserContext } from "@playwright/test";
import { APP_ROUTES } from "../../src/config/env.js";
import { expect, SESSION_HINT_COOKIE, test } from "../../src/fixtures/test.js";
import { waitForHydration } from "../../src/support/ui.js";

/** Grava um cookie legível pela página no domínio do web (o Playwright recusa `url` junto). */
async function setPageCookie(
  context: BrowserContext,
  baseURL: string,
  name: string,
  value: string,
): Promise<void> {
  await context.addCookies([
    {
      name,
      value,
      domain: new URL(baseURL).hostname,
      path: "/",
      sameSite: "Lax",
      httpOnly: false,
      secure: false,
    },
  ]);
}

async function cookieValue(context: BrowserContext, name: string): Promise<string> {
  return (await context.cookies()).find((c) => c.name === name)?.value ?? "";
}

test.describe("guardas de rota", () => {
  test.describe("visitante", () => {
    test.use({ authenticate: false });

    test("visitante na raiz é mandado para o login, sem destino", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    });

    for (const route of APP_ROUTES) {
      test(`visitante em ${route} é mandado para o login com a rota pretendida`, async ({
        page,
      }) => {
        await page.goto(route);

        await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(route)}$`));
      });
    }

    test("depois de entrar, volta à rota protegida que tentou abrir", async ({
      page,
      seedUser,
    }) => {
      await page.goto("/receitas");
      await expect(page).toHaveURL(/\/login\?next=%2Freceitas$/);
      await waitForHydration(page);

      await page.getByLabel("E-mail").fill(seedUser.email);
      await page.getByLabel("Senha").fill(seedUser.password);
      await page.getByRole("button", { name: "Entrar" }).click();

      await expect(page).toHaveURL(/\/receitas$/);
      await expect(page.getByRole("heading", { name: "Receitas" })).toBeVisible();
    });

    test("destino apontando para outro site cai no dashboard", async ({ page, seedUser }) => {
      await page.goto(`/login?next=${encodeURIComponent("//exemplo.invalid/roubo")}`);
      await waitForHydration(page);

      await page.getByLabel("E-mail").fill(seedUser.email);
      await page.getByLabel("Senha").fill(seedUser.password);
      await page.getByRole("button", { name: "Entrar" }).click();

      await expect(page).toHaveURL(/\/dashboard$/);
    });

    test("o cookie userId da versão anterior não abre sessão", async ({
      page,
      context,
      baseURL,
      seedUser,
    }) => {
      await setPageCookie(context, baseURL!, "userId", seedUser.id);

      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
      await expect.poll(() => cookieValue(context, "userId")).toBe("");
    });
  });

  test("autenticado em /login é levado ao dashboard", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("autenticado em /cadastro é levado ao dashboard", async ({ page }) => {
    await page.goto("/cadastro");

    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test.describe("sessão inválida", () => {
    test.use({ authenticate: false });

    /**
     * O proxy só olha o INDICADOR — quem decide a sessão é a renovação. Sem cookie de refresh ela
     * volta 401, o web apaga o indicador ANTES de mandar para o login, e o proxy não devolve o
     * usuário a `/dashboard`: sem laço.
     */
    test("indicador sem refresh válido acaba no login, com o indicador apagado", async ({
      page,
      context,
      baseURL,
    }) => {
      await setPageCookie(context, baseURL!, SESSION_HINT_COOKIE, "1");

      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/login$/);
      await expect.poll(() => cookieValue(context, SESSION_HINT_COOKIE)).toBe("");
      await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    });
  });
});
