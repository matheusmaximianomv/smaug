import { randomUUID } from "node:crypto";
import { expect, test } from "../../src/fixtures/test.js";
import { goto, waitForHydration } from "../../src/support/ui.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe("cadastro", () => {
  test.use({ authenticate: false });

  test("cria a conta e exibe o ID gerado", async ({ page }) => {
    await goto(page, "/cadastro");

    await page.getByLabel("Nome").fill("Bilbo Bolseiro");
    await page.getByLabel("Email").fill(`e2e-${randomUUID()}@e2e.local`);
    await page.getByRole("button", { name: "Criar Conta" }).click();

    await expect(page.getByText("Cadastro realizado com sucesso!")).toBeVisible();

    const idField = page.getByRole("textbox");
    await expect(idField).toHaveAttribute("readonly", "");
    expect(await idField.inputValue()).toMatch(UUID_RE);
  });

  test("o ID recém-criado autentica no login", async ({ page }) => {
    await goto(page, "/cadastro");
    await page.getByLabel("Nome").fill("Frodo Bolseiro");
    await page.getByLabel("Email").fill(`e2e-${randomUUID()}@e2e.local`);
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page.getByText("Cadastro realizado com sucesso!")).toBeVisible();

    const novoId = await page.getByRole("textbox").inputValue();

    // Navegação dura (window.location.href): o documento é outro e precisa
    // hidratar de novo antes de o submit ser interceptado pelo React.
    await page.getByRole("button", { name: "Ir para Login" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await waitForHydration(page);

    await page.getByLabel("ID do Usuário").fill(novoId);
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Frodo Bolseiro", { exact: true })).toBeVisible();
  });

  test("recusa e-mail já cadastrado", async ({ page, seedUser }) => {
    await goto(page, "/cadastro");

    await page.getByLabel("Nome").fill("Outro Nome");
    await page.getByLabel("Email").fill(seedUser.email);
    await page.getByRole("button", { name: "Criar Conta" }).click();

    await expect(page.getByText("Já existe uma conta com este e-mail.")).toBeVisible();
  });

  test("valida nome e e-mail antes de enviar", async ({ page }) => {
    await goto(page, "/cadastro");

    // Formulário vazio: as duas mensagens do Zod.
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page.getByText("Nome é obrigatório")).toBeVisible();
    await expect(page.getByText("Email inválido")).toBeVisible();

    // E-mail malformado: alcançável porque o `<form>` tem `noValidate` — sem
    // ele a validação nativa do browser barraria o submit antes do React.
    await page.getByPlaceholder("Seu nome completo").fill("Maria Souza");
    await page.getByPlaceholder("seu@email.com").fill("nao-e-email");
    await page.getByRole("button", { name: "Criar Conta" }).click();
    await expect(page.getByText("Email inválido")).toBeVisible();
  });
});
