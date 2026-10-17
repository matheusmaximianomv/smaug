import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { API_URL } from "../config/env.js";
import { SeedClient } from "../api/seed-client.js";
import type { UserDto } from "../api/types.js";
import { competenceKit, type CompetenceKit } from "../support/competence.js";

interface Options {
  /** `false` para os testes de guarda do middleware. */
  authenticate: boolean;
}

interface Fixtures {
  apiRequest: APIRequestContext;
  seedUser: UserDto;
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
   * Um usuário NOVO por teste. Toda linha da API é escopada por usuário
   * (`extractUser` injeta req.userId e todas as consultas filtram), então dois
   * testes são invisíveis um ao outro — inclusive na unicidade de nome de
   * categoria, que é por usuário. Custa um POST /users (~10ms) e é o que permite
   * `fullyParallel` sem truncar tabelas.
   */
  seedUser: async ({ apiRequest }, use, testInfo) => {
    const user = await new SeedClient(apiRequest).createUser({
      name: `E2E ${testInfo.title.slice(0, 40)}`,
      email: `e2e-${randomUUID()}@e2e.local`,
    });
    await use(user);
    // Sem cleanup: o arquivo SQLite inteiro é descartado no fim da execução.
  },

  seed: async ({ apiRequest, seedUser }, use) => {
    await use(new SeedClient(apiRequest, seedUser.id));
  },

  context: async ({ context, authenticate, seedUser, baseURL }, use) => {
    // Google Fonts fora do caminho crítico: em CI sem rede é latência e flake
    // de graça (app/layout.tsx carrega por <link> externo).
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());

    if (authenticate) {
      // Mesmo cookie que middleware.ts lê no servidor e session.ts lê no cliente.
      // httpOnly:false é obrigatório — infra/session.ts acessa document.cookie.
      // domain+path (e não `url`): o Playwright recusa os dois juntos, e este é
      // exatamente o par que session.ts grava (path=/, SameSite=Lax).
      await context.addCookies([
        {
          name: "userId",
          value: seedUser.id,
          domain: new URL(baseURL!).hostname,
          path: "/",
          sameSite: "Lax",
          httpOnly: false,
          secure: false,
        },
      ]);
    }

    await use(context);
  },

  competence: async ({}, use) => {
    await use(competenceKit());
  },
});

export { expect };
