import type { Page, Request, Response } from "@playwright/test";
import { ACCESS_TOKEN_TTL_SECONDS } from "../../src/config/env.js";
import type { SeedClient } from "../../src/api/seed-client.js";
import { expect, signInBrowser, test } from "../../src/fixtures/test.js";
import type { CompetenceKit } from "../../src/support/competence.js";
import { goto } from "../../src/support/ui.js";

/**
 * Aba do app que sabe esperar o repouso: o menu mostra quem está logado e nenhuma chamada a `/api`
 * está em voo há meio segundo. O repouso importa porque o web hoje renova mais de uma vez por
 * carregamento (as consultas saem antes de a retomada terminar, voltam 401 e pedem outra
 * renovação): agir com uma renovação ainda em voo mistura o efeito da ação com o do carregamento.
 */
function abaDoApp(page: Page) {
  const emVoo = new Set<Request>();
  let ultimaAtividade = Date.now();
  const isApi = (r: Request) => new URL(r.url()).pathname.startsWith("/api/");
  page.on("request", (r) => {
    if (!isApi(r)) return;
    emVoo.add(r);
    ultimaAtividade = Date.now();
  });
  const terminou = (r: Request) => {
    if (emVoo.delete(r)) ultimaAtividade = Date.now();
  };
  page.on("requestfinished", terminou);
  page.on("requestfailed", terminou);
  // Uma recarga abandona o que o documento anterior tinha em voo, nem sempre com evento de fim.
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) emVoo.clear();
  });

  return {
    page,
    async logadaComo(name: string): Promise<void> {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      await expect
        .poll(() => emVoo.size === 0 && Date.now() - ultimaAtividade > 500, { intervals: [250] })
        .toBe(true);
    },
  };
}

/** Uma ação que só fala com a API (estado local do dashboard, sem trocar de rota no Next). */
async function agirNoDashboard(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Próximo mês" }).click();
}

/** Resposta da renovação vista pelo navegador, no repasse `/api` do web. */
function renovacao(page: Page) {
  return page.waitForResponse((r) => r.url().endsWith("/api/auth/refresh"));
}

/**
 * Toasts que apareceram no documento, mesmo os que já sumiram: o `ToastContainer` não tem papel
 * próprio (é o `div` fixo no canto inferior direito) e some sozinho depois de alguns segundos, então
 * olhar só no fim deixaria passar um erro mostrado e já fechado. Vale por documento: chame antes do
 * `goto`, e uma recarga recomeça a lista.
 */
async function vigiarToasts(page: Page): Promise<() => Promise<string[]>> {
  await page.addInitScript(() => {
    const vistos: string[] = [];
    (window as unknown as { __toasts: string[] }).__toasts = vistos;
    new MutationObserver(() => {
      for (const p of Array.from(document.querySelectorAll("div.fixed.bottom-4.right-4 p"))) {
        const texto = p.textContent ?? "";
        if (!vistos.includes(texto)) vistos.push(texto);
      }
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  return () => page.evaluate(() => (window as unknown as { __toasts: string[] }).__toasts);
}

/** Todo endereço por que a aba passou: um desvio por `/login` aparece aqui mesmo se voltar. */
function urlsVisitadas(page: Page): string[] {
  const urls: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) urls.push(new URL(frame.url()).pathname);
  });
  return urls;
}

/** Uma despesa e uma receita no mês corrente, para cada tela ter um dado do usuário a mostrar. */
async function semearMes(seed: SeedClient, competence: CompetenceKit): Promise<void> {
  const category = await seed.createCategory("Mercado");
  await seed.createOneTimeExpense({
    description: "Feira da semana",
    amount: 87.5,
    categoryId: category.id,
    competence: competence.current,
  });
  await seed.createOneTimeRevenue({
    description: "Freela do mês",
    amount: 1200,
    competence: competence.current,
  });
}

/** A linha do extrato é um botão cujo nome acessível começa pela descrição. */
function linha(page: Page, description: string) {
  return page.getByRole("button", { name: new RegExp(`^${description}`) });
}

test.describe("sessão no navegador", () => {
  test("recarregar /despesas mantém a pessoa na tela, com os dados dela", async ({
    page,
    seed,
    seedUser,
    competence,
  }) => {
    await semearMes(seed, competence);
    const toasts = await vigiarToasts(page);
    const aba = abaDoApp(page);
    await goto(page, "/despesas");
    await aba.logadaComo(seedUser.name);
    await expect(linha(page, "Feira da semana")).toBeVisible();
    const urls = urlsVisitadas(page);

    await page.reload();

    await aba.logadaComo(seedUser.name);
    await expect(page).toHaveURL(/\/despesas$/);
    await expect(linha(page, "Feira da semana")).toBeVisible();
    expect(urls).not.toContain("/login");
    expect(await toasts()).toEqual([]);
  });

  /**
   * O cenário "uso contínuo por mais de 10 minutos", encurtado: a API do run emite access tokens de
   * `ACCESS_TOKEN_TTL_SECONDS` (ver `config/env.ts`), então basta ficar parado além da vida dele e
   * da tolerância de relógio da API (5 s) para a próxima consulta voltar 401. O web tem de renovar
   * em silêncio e refazer a consulta — sem toast, sem passar pelo login. A troca de tela é pelo
   * menu (navegação do cliente), que mantém o token vencido em memória; uma recarga não serviria,
   * porque começaria sem token e renovaria antes de qualquer 401.
   */
  test("access token vencido no meio do uso é renovado em silêncio", async ({
    page,
    seed,
    seedUser,
    competence,
  }) => {
    test.setTimeout(60_000 + ACCESS_TOKEN_TTL_SECONDS * 1000);
    await semearMes(seed, competence);
    const toasts = await vigiarToasts(page);
    const aba = abaDoApp(page);
    await goto(page, "/despesas");
    await aba.logadaComo(seedUser.name);
    await expect(linha(page, "Feira da semana")).toBeVisible();

    const urls = urlsVisitadas(page);
    const respostas: Response[] = [];
    page.on("response", (r) => {
      if (new URL(r.url()).pathname.startsWith("/api/")) respostas.push(r);
    });
    await page.waitForTimeout((ACCESS_TOKEN_TTL_SECONDS + 5 + 2) * 1000);

    await page
      .getByRole("navigation", { name: "Navegação principal" })
      .getByRole("link", { name: "Receitas" })
      .click();

    await expect(page).toHaveURL(/\/receitas$/);
    await expect(linha(page, "Freela do mês")).toBeVisible();
    await aba.logadaComo(seedUser.name);
    expect(urls).not.toContain("/login");
    expect(await toasts()).toEqual([]);

    const chamada = (r: Response) => `${r.request().method()} ${new URL(r.url()).pathname}`;
    const vencida = respostas.findIndex(
      (r) => r.status() === 401 && !new URL(r.url()).pathname.startsWith("/api/auth/"),
    );
    expect(vencida, "uma consulta deveria voltar 401 com o token vencido").toBeGreaterThanOrEqual(
      0,
    );
    const renovada = respostas.findIndex(
      (r, i) => i > vencida && chamada(r) === "POST /api/auth/refresh",
    );
    expect(renovada, "o 401 deveria disparar a renovação").toBeGreaterThan(vencida);
    expect(respostas[renovada].status()).toBe(200);
    const refeita = respostas.findIndex(
      (r, i) =>
        i > renovada &&
        r.url() === respostas[vencida].url() &&
        chamada(r) === chamada(respostas[vencida]),
    );
    expect(refeita, "a consulta recusada deveria ser refeita depois da renovação").toBeGreaterThan(
      renovada,
    );
    expect(respostas[refeita].status()).toBe(200);
  });

  /**
   * As duas abas renovam com o MESMO cookie ao mesmo tempo: uma gira o refresh, a outra recebe
   * 409 dentro da janela de tolerância de 30 s, espera o cookie novo e renova de novo. Sem a
   * janela, o reuso revogaria a família e as duas cairiam no login (R5 do PRD).
   */
  test("duas abas recarregadas juntas continuam logadas", async ({ context, page, seedUser }) => {
    const a = abaDoApp(page);
    const b = abaDoApp(await context.newPage());
    await goto(a.page, "/dashboard");
    await a.logadaComo(seedUser.name);
    await goto(b.page, "/despesas");
    await b.logadaComo(seedUser.name);

    for (let rodada = 0; rodada < 2; rodada++) {
      await Promise.all([a.page.reload(), b.page.reload()]);

      await a.logadaComo(seedUser.name);
      await b.logadaComo(seedUser.name);
    }
    await expect(a.page).toHaveURL(/\/dashboard$/);
    await expect(b.page).toHaveURL(/\/despesas$/);
    await expect(b.page.getByRole("heading", { name: "Despesas" })).toBeVisible();
  });

  test("sair numa aba derruba a outra na próxima ação", async ({ context, page, seedUser }) => {
    const a = abaDoApp(page);
    const b = abaDoApp(await context.newPage());
    await goto(a.page, "/dashboard");
    await a.logadaComo(seedUser.name);
    await goto(b.page, "/dashboard");
    await b.logadaComo(seedUser.name);

    await a.page.getByRole("button", { name: "Sair", exact: true }).click();
    await expect(a.page).toHaveURL(/\/login$/);

    // A aba B ainda tem o access token em memória, mas a sessão dele foi revogada: a API recusa,
    // a renovação também (o cookie de refresh se foi), e o web manda para o login.
    const [resposta] = await Promise.all([renovacao(b.page), agirNoDashboard(b.page)]);
    expect(resposta.status()).toBe(401);
    await expect(b.page).toHaveURL(/\/login$/);
  });

  test("sair de todos os dispositivos derruba a sessão de outro navegador", async ({
    browser,
    apiRequest,
    baseURL,
    page,
    seedUser,
  }) => {
    // O "celular": outro contexto, com cookies próprios e uma sessão própria aberta por login.
    const celular = await browser.newContext();
    await celular.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await signInBrowser(celular, apiRequest, seedUser, baseURL!);
    const outro = abaDoApp(await celular.newPage());
    await goto(outro.page, "/dashboard");
    await outro.logadaComo(seedUser.name);

    const este = abaDoApp(page);
    await goto(este.page, "/dashboard");
    await este.logadaComo(seedUser.name);
    await este.page.getByRole("button", { name: "Sair de todos os dispositivos" }).click();
    await expect(este.page).toHaveURL(/\/login$/);

    const [resposta] = await Promise.all([renovacao(outro.page), agirNoDashboard(outro.page)]);
    expect(resposta.status()).toBe(401);
    await expect(outro.page).toHaveURL(/\/login$/);

    // Recarregar não ressuscita nada: o indicador foi apagado antes do redirect.
    await outro.page.goto("/dashboard");
    await expect(outro.page).toHaveURL(/\/login\?next=%2Fdashboard$/);
    await celular.close();
  });
});
