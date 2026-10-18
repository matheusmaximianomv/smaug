import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import type { APIRequestContext, BrowserContext } from "@playwright/test";
import { API_URL } from "../config/env.js";
import { REFRESH_COOKIE, SeedClient, type OpenedSession } from "../api/seed-client.js";
import { competenceKit, type CompetenceKit } from "../support/competence.js";

interface Options {
  /** `false` para os testes de guarda do proxy. */
  authenticate: boolean;
}

/** Usuário semeado: o perfil, a senha em claro e a sessão que o seed usa. */
export interface SeedUser {
  id: string;
  name: string;
  email: string;
  password: string;
  /** Sessão do SEED. O navegador recebe outra, só dele (ver `signInBrowser`). */
  session: OpenedSession;
}

/** Indicador de sessão que o `proxy.ts` do web lê para decidir a rota. */
export const SESSION_HINT_COOKIE = "smaug_session";

/**
 * Loga o navegador do jeito que o web faria, sem passar pela tela: abre uma sessão NOVA pela API
 * (`POST /auth/login`) e põe no contexto o cookie de refresh e o indicador. Ao abrir uma página
 * protegida o web não tem access token em memória e renova em silêncio.
 *
 * - `smaug_refresh` vai no domínio do WEB com `path: "/api/auth"` — é o par que o navegador
 *   enviaria ao repasse `/api/auth/refresh` —, `httpOnly` e `SameSite=Strict`, como a API o emite.
 * - Uma sessão separada da do seed: o "Sair" do navegador revoga só a dele, e o seed continua
 *   valendo para asserções depois do logout.
 * - `domain` + `path` (e não `url`): o Playwright recusa os dois juntos.
 */
export async function signInBrowser(
  context: BrowserContext,
  api: APIRequestContext,
  user: Pick<SeedUser, "email" | "password">,
  baseURL: string,
): Promise<OpenedSession> {
  const session = await new SeedClient(api).login(user.email, user.password);
  const domain = new URL(baseURL).hostname;
  await context.addCookies([
    {
      name: REFRESH_COOKIE,
      value: session.refreshToken,
      domain,
      path: "/api/auth",
      httpOnly: true,
      sameSite: "Strict",
      secure: false,
    },
    {
      name: SESSION_HINT_COOKIE,
      value: "1",
      domain,
      path: "/",
      httpOnly: false,
      sameSite: "Lax",
      secure: false,
    },
  ]);
  return session;
}

interface Fixtures {
  apiRequest: APIRequestContext;
  seedUser: SeedUser;
  seed: SeedClient;
  competence: CompetenceKit;
}

export const test = base.extend<Options & Fixtures>({
  authenticate: [true, { option: true }],

  apiRequest: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext({ baseURL: API_URL });
    await use(ctx);
    await ctx.dispose();
  },

  /**
   * Um usuário NOVO por teste. Toda linha da API é escopada pelo usuário do
   * Bearer (o middleware `authenticate` injeta req.userId e todas as consultas
   * filtram), então dois testes são invisíveis um ao outro — inclusive na
   * unicidade de nome de categoria, que é por usuário. Custa um POST
   * /auth/register (Argon2id no mínimo de teste) e é o que permite
   * `fullyParallel` sem truncar tabelas.
   */
  seedUser: async ({ apiRequest }, use, testInfo) => {
    const password = `senha-${randomUUID()}`;
    const session = await new SeedClient(apiRequest).register({
      name: `E2E ${testInfo.title.slice(0, 40)}`,
      email: `e2e-${randomUUID()}@e2e.local`,
      password,
    });
    await use({ ...session.user, password, session });
    // Sem cleanup: o arquivo SQLite inteiro é descartado no fim da execução.
  },

  seed: async ({ apiRequest, seedUser }, use) => {
    await use(new SeedClient(apiRequest, seedUser.session.accessToken));
  },

  context: async ({ context, authenticate, apiRequest, seedUser, baseURL }, use) => {
    // Google Fonts fora do caminho crítico: em CI sem rede é latência e flake
    // de graça (app/layout.tsx carrega por <link> externo).
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    if (authenticate) {
      await signInBrowser(context, apiRequest, seedUser, baseURL!);
    }

    await use(context);
  },

  competence: async ({}, use) => {
    await use(competenceKit());
  },
});

export { expect };
