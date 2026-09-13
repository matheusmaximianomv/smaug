import { APP_ROUTES } from "../../src/config/env.js";
import { expect, test } from "../../src/fixtures/test.js";
import { dialog, documentOverflow, goto, hideDevOverlays } from "../../src/support/ui.js";

/**
 * Roda só no projeto `mobile-chromium` (Pixel 5, 393×851), que é o que aciona o
 * breakpoint `(max-width: 768px)` do `AppShell`.
 */
test.describe("layout no celular", () => {
  test("troca a sidebar fixa pelo menu inferior", async ({ page }) => {
    await goto(page, "/dashboard");

    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0);

    const bottomNav = page.getByRole("navigation", { name: "Navegação inferior" });
    await expect(bottomNav).toBeVisible();
    await expect(bottomNav.getByRole("link")).toHaveCount(5);
  });

  test("a barra superior abre a sidebar em overlay e o overlay fecha", async ({ page }) => {
    await goto(page, "/dashboard");

    await page.getByRole("button", { name: "Abrir menu" }).click();

    const sidebar = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(sidebar).toBeVisible();

    // A sidebar em overlay ocupa 236px; clicar à direita disso cai no fundo
    // escurecido, que é quem fecha.
    await page.mouse.click(370, 400);

    await expect(sidebar).toHaveCount(0);
  });

  test("navega por todas as rotas pelo menu inferior", async ({ page }) => {
    await goto(page, "/dashboard");
    await hideDevOverlays(page);

    const bottomNav = page.getByRole("navigation", { name: "Navegação inferior" });
    const destinos = [
      { label: "Receitas", url: /\/receitas$/ },
      { label: "Despesas", url: /\/despesas$/ },
      { label: "Categorias", url: /\/categorias$/ },
      { label: "Histórico", url: /\/historico$/ },
      { label: "Dashboard", url: /\/dashboard$/ },
    ];

    for (const destino of destinos) {
      await bottomNav.getByRole("link", { name: destino.label }).click();
      await expect(page).toHaveURL(destino.url);
    }
  });

  for (const route of APP_ROUTES) {
    test(`o conteúdo de ${route} não estoura horizontalmente`, async ({ page }) => {
      await goto(page, route);

      expect(await documentOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test("é possível criar uma categoria pelo celular", async ({ page }) => {
    await goto(page, "/categorias");

    await page.getByRole("button", { name: "Nova categoria" }).click();
    await dialog(page).getByLabel("Nome da categoria").fill("Transporte");
    await dialog(page).getByRole("button", { name: "Criar categoria" }).click();

    await expect(page.getByTestId("category-card")).toContainText("Transporte");
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("a tabela de receitas rola na horizontal sem estourar a página", async ({
    page,
    seed,
    competence,
  }) => {
    await seed.createOneTimeRevenue({
      description: "Consultoria de arquitetura de software para cliente internacional",
      amount: 12345.67,
      competence: competence.current,
    });

    await goto(page, "/receitas");
    await expect(page.getByRole("row")).not.toHaveCount(0);

    const container = page.locator("div.overflow-x-auto").first();
    const rolagem = await container.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    expect(rolagem.scrollWidth).toBeGreaterThan(rolagem.clientWidth);
    expect(await documentOverflow(page)).toBeLessThanOrEqual(1);
  });
});
