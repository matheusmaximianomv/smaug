import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { APP_ROUTES } from "../../src/config/env.js";
import { expect, test } from "../../src/fixtures/test.js";

/** Mesmo par domain+path que `infra/session.ts` grava (o Playwright recusa `url` junto). */
async function setSessionCookie(
  context: BrowserContext,
  baseURL: string,
  value: string,
): Promise<void> {
  await context.addCookies([
    {
      name: "userId",
      value,
      domain: new URL(baseURL).hostname,
      path: "/",
      sameSite: "Lax",
      httpOnly: false,
      secure: false,
    },
  ]);
}

test.describe("guardas de rota", () => {
  test.describe("visitante", () => {
    test.use({ authenticate: false });

    test("visitante no dashboard é mandado para o login", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    });

    test("visitante na raiz é mandado para o login", async ({ page }) => {
      await page.goto("/");

      await expect(page).toHaveURL(/\/login$/);
    });

    for (const route of APP_ROUTES) {
      test(`visitante em ${route} é mandado para o login`, async ({ page }) => {
        await page.goto(route);

        await expect(page).toHaveURL(/\/login$/);
      });
    }
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
     * O middleware só checa a PRESENÇA do cookie — quem recusa o valor é a API
     * (`extractUser` exige UUID). O 401 dispara o interceptor, que limpa a
     * sessão e chama `redirectToLogin`.
     */
    test("cookie com valor não-UUID acaba no login, com a sessão limpa", async ({
      page,
      context,
      baseURL,
    }) => {
      await setSessionCookie(context, baseURL!, "nao-e-um-uuid");

      await page.goto("/dashboard");

      await expect(page).toHaveURL(/\/login$/);
      await expect
        .poll(async () => (await context.cookies()).find((c) => c.name === "userId")?.value ?? "")
        .toBe("");
    });

    /**
     * UUID bem formado mas inexistente: `getUserById` devolve 404,
     * `isInvalidSessionError` reconhece e `clearUserId()` apaga o cookie. Sem
     * cookie, a próxima navegação já é barrada pelo middleware.
     */
    test("cookie com UUID inexistente limpa a sessão e a rota volta a ser barrada", async ({
      page,
      context,
      baseURL,
    }) => {
      await setSessionCookie(context, baseURL!, randomUUID());

      await page.goto("/dashboard");

      await expect
        .poll(async () => (await context.cookies()).find((c) => c.name === "userId")?.value ?? "")
        .toBe("");

      await page.goto("/dashboard");
      await expect(page).toHaveURL(/\/login$/);
    });
  });
});
