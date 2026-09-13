import { API_URL } from "../src/config/env.js";
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
   * Guarda contra `web/.env.local` sobrescrever NEXT_PUBLIC_API_URL e o browser
   * acabar batendo na porta 3000 (dev.db) em vez da API isolada do E2E.
   */
  test("o front aponta para a API isolada do E2E", async ({ page, seed, seedUser }) => {
    await seed.createCategory("Alimentação");

    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/expenses/categories")),
      page.goto("/categorias"),
    ]);

    expect(response.url().startsWith(API_URL)).toBe(true);
    expect(response.request().headers()["x-user-id"]).toBe(seedUser.id);
    await expect(page.getByTestId("category-card")).toHaveCount(1);
  });
});
