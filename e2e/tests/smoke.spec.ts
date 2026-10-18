import { API_URL, WEB_URL } from "../src/config/env.js";
import { expect, test } from "../src/fixtures/test.js";

test.describe("smoke", () => {
  test("a API responde /health com status ok e provider sqlite", async ({ apiRequest }) => {
    const res = await apiRequest.get("/health");

    expect(res.status()).toBe(200);
    const body = (await res.json()) as { status: string; database: { provider: string } };
    expect(body.status).toBe("ok");
    expect(body.database.provider).toBe("sqlite");
  });

  test.describe("sem autenticação", () => {
    test.use({ authenticate: false });

    test("a tela de login carrega", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    });
  });

  test("o banco desta execução está isolado: o usuário novo não vê dados de terceiros", async ({
    seed,
  }) => {
    await expect.poll(async () => (await seed.listCategories()).length).toBe(0);

    await seed.createCategory("Moradia");

    const categories = await seed.listCategories();
    expect(categories).toHaveLength(1);
    expect(categories[0].name).toBe("Moradia");
  });

  /**
   * Guarda contra o web subir sem `API_ORIGIN` (ou com um `web/.env.local` apontando para a porta
   * 3000, o dev.db): o navegador só fala com a origem do web, e o repasse `/api` leva à API
   * isolada do E2E — é ela que conhece o usuário semeado.
   */
  test("o front fala só com o web e o repasse chega à API isolada do E2E", async ({
    page,
    seed,
  }) => {
    await seed.createCategory("Alimentação");
    const browserRequests: string[] = [];
    page.on("request", (request) => browserRequests.push(request.url()));

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/expenses/categories") && r.ok()),
      page.goto("/categorias"),
    ]);

    expect(response.url().startsWith(`${WEB_URL}/api/`)).toBe(true);
    expect(response.request().headers()["authorization"]).toMatch(/^Bearer /);
    await expect(page.getByTestId("category-card")).toHaveCount(1);
    expect(browserRequests.filter((url) => url.startsWith(API_URL))).toEqual([]);
  });
});
