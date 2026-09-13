import { randomUUID } from "node:crypto";
import { request } from "@playwright/test";
import { API_URL, APP_ROUTES, DB_FILE, PUBLIC_ROUTES, WEB_MODE, WEB_URL } from "./config/env.js";
import { baseCompetence } from "./support/competence.js";

/**
 * Verifica e aquece — NÃO cria o banco.
 *
 * O banco é provisionado por `scripts/run-e2e.mjs`, antes do Playwright subir.
 * Tem que ser assim: o `webServer` é um plugin e sobe ANTES deste globalSetup,
 * então um `db push --force-reset` aqui derrubaria o inode debaixo da conexão
 * que o Express já abriu.
 */
export default async function globalSetup(): Promise<void> {
  // --- guarda: jamais apontar para o banco de desenvolvimento ---
  if (/server[\\/]prisma/.test(DB_FILE) || /dev\.db$/.test(DB_FILE)) {
    throw new Error(`[e2e] banco de teste aponta para área de desenvolvimento: ${DB_FILE}`);
  }

  const api = await request.newContext({ baseURL: API_URL });

  // --- prontidão real: /health só dá 200 quando o SELECT 1 passa ---
  const health = await api.get("/health");
  if (!health.ok()) {
    throw new Error(`[e2e] /health respondeu ${health.status()} (esperado 200).`);
  }
  const healthBody = (await health.json()) as {
    status: string;
    database?: { provider?: string };
  };
  if (healthBody.database?.provider !== "sqlite") {
    throw new Error(
      `[e2e] provider é "${healthBody.database?.provider}", esperado "sqlite". ` +
        "A stack subiu com a env errada.",
    );
  }

  // --- prova de schema: /health passa mesmo sem tabelas (SELECT 1 não precisa
  //     delas). Só uma escrita real prova que o `db push` rodou. ---
  const probe = await api.post("/users", {
    data: { name: "e2e-probe", email: `probe-${randomUUID()}@e2e.local` },
  });
  if (probe.status() !== 201) {
    throw new Error(
      `[e2e] POST /users devolveu ${probe.status()} — o banco provavelmente está sem schema.\n` +
        "Rode a suíte por `npm run test:e2e` (o script cria o SQLite desta execução).",
    );
  }
  const probeUser = (await probe.json()) as { id: string };

  // --- congela a competência base e propaga por env ---
  // Os workers são forkados depois daqui e herdam o process.env, então todos
  // concordam mesmo que a execução cruze a virada do mês UTC.
  const current = baseCompetence();
  process.env.E2E_BASE_COMPETENCE = JSON.stringify(current);

  const now = new Date();
  const nextMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const minutesLeft = (nextMonth - now.getTime()) / 60_000;
  if (minutesLeft < 15) {
    console.warn(
      `[e2e] ATENÇÃO: faltam ${Math.round(minutesLeft)} min para a virada do mês UTC. ` +
        "Testes sensíveis a competência podem ficar instáveis.",
    );
  }

  // --- warm-up: paga a compilação sob demanda do `next dev` fora do relógio ---
  if (WEB_MODE === "dev") {
    const web = await request.newContext({ baseURL: WEB_URL });
    const started = Date.now();
    for (const route of PUBLIC_ROUTES) {
      await web.get(route).catch(() => undefined);
    }
    for (const route of APP_ROUTES) {
      // Cookie para passar pelo middleware e realmente compilar a rota.
      await web
        .get(route, { headers: { Cookie: `userId=${probeUser.id}` } })
        .catch(() => undefined);
    }
    console.log(
      `[e2e] warm-up de ${PUBLIC_ROUTES.length + APP_ROUTES.length} rotas em ${Date.now() - started}ms`,
    );
    await web.dispose();
  }

  await api.dispose();
}
