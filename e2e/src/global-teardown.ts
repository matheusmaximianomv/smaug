import { rmSync } from "node:fs";
import { DB_FILE, MANAGED_BY_WRAPPER } from "./config/env.js";

/**
 * Cinto e suspensório.
 *
 * No caminho normal (`npm run test:e2e`) este teardown NÃO faz nada: o wrapper é
 * a autoridade, e ele remove o arquivo depois que o Playwright já derrubou os
 * webServer. Aqui os servidores ainda estão vivos — o globalTeardown roda ANTES
 * do teardown do plugin webServer.
 *
 * Serve apenas ao caminho IDE (`npx playwright test` solto).
 */
export default async function globalTeardown(): Promise<void> {
  if (MANAGED_BY_WRAPPER) return;
  if (process.env.E2E_KEEP_DB) return;
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(DB_FILE + suffix, { force: true });
  }
}
