import { randomUUID } from "node:crypto";
import type { Page } from "@playwright/test";
import { expect, test } from "../../src/fixtures/test.js";
import { goto } from "../../src/support/ui.js";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Preenche o cadastro; `Senha` exige `exact` porque "Confirmar senha" também casaria. */
async function preencherCadastro(
  page: Page,
  dados: { name: string; email: string; password: string; confirmation?: string },
): Promise<void> {
  await page.getByLabel("Nome").fill(dados.name);
  await page.getByLabel("E-mail").fill(dados.email);
  await page.getByLabel("Senha", { exact: true }).fill(dados.password);
  await page.getByLabel("Confirmar senha").fill(dados.confirmation ?? dados.password);
}

/** Registra as chamadas de cadastro que saem do navegador (pelo repasse `/api`). */
function chamadasDeCadastro(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/auth/register")) urls.push(request.url());
  });
  return urls;
}

test.describe("cadastro", () => {
  test.use({ authenticate: false });

  test("cria a conta e cai no dashboard já logado, sem ver o próprio ID", async ({ page }) => {
    await goto(page, "/cadastro");

    await preencherCadastro(page, {
      name: "Bilbo Bolseiro",
      email: `e2e-${randomUUID()}@e2e.local`,
      password: "um-anel-para-todos",
    });
    await page.getByRole("button", { name: "Criar Conta" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Bilbo Bolseiro", { exact: true })).toBeVisible();
    await expect(page.locator("body")).not.toContainText(UUID_RE);
  });

  test("a conta recém-criada entra pelo login com e-mail e senha", async ({ page }) => {
    const email = `e2e-${randomUUID()}@e2e.local`;
    await goto(page, "/cadastro");
    await preencherCadastro(page, {
      name: "Frodo Bolseiro",
      email,
      password: "o-condado-e-longe",
    });
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);

    await goto(page, "/login");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("o-condado-e-longe");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Frodo Bolseiro", { exact: true })).toBeVisible();
  });

  test("recusa e-mail já cadastrado e oferece o caminho para entrar", async ({
    page,
    seedUser,
  }) => {
    await goto(page, "/cadastro");

    await preencherCadastro(page, {
      name: "Outro Nome",
      email: seedUser.email,
      password: "outra-senha-qualquer",
    });
    await page.getByRole("button", { name: "Criar Conta" }).click();

    // O Next também monta um `role="alert"` (o anunciador de rotas): filtrar pelo texto.
    const alerta = page
      .getByRole("alert")
      .filter({ hasText: "Já existe uma conta com este e-mail." });
    await expect(alerta).toBeVisible();
    await expect(alerta.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    await expect(page).toHaveURL(/\/cadastro$/);
  });

  test("confirmação divergente e senha curta barram o envio", async ({ page }) => {
    const chamadas = chamadasDeCadastro(page);
    await goto(page, "/cadastro");

    await preencherCadastro(page, {
      name: "Maria Souza",
      email: `e2e-${randomUUID()}@e2e.local`,
      password: "senha-bem-comprida",
      confirmation: "senha-diferente-aqui",
    });
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page.getByText("As senhas não coincidem")).toBeVisible();

    await preencherCadastro(page, {
      name: "Maria Souza",
      email: `e2e-${randomUUID()}@e2e.local`,
      password: "curta",
    });
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page.getByText("A senha deve ter pelo menos 12 caracteres")).toBeVisible();

    expect(chamadas).toEqual([]);
    await expect(page).toHaveURL(/\/cadastro$/);
  });
});
