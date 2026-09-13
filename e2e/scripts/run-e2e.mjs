#!/usr/bin/env node
/**
 * A "switch de testes" E2E.
 *
 * Um comando: cria um arquivo SQLite exclusivo para esta execução, sobe a stack
 * contra ele, roda o Playwright e descarta o arquivo ao final.
 *
 * Por que um wrapper externo e não o globalSetup do Playwright:
 *
 * 1. ORDEM. O `webServer` do Playwright é um *plugin*, e plugins sobem ANTES do
 *    globalSetup. Se o banco fosse criado lá, o Express já teria aberto um SQLite
 *    vazio, `/health` responderia 200 (o SELECT 1 não precisa de tabelas) e o
 *    `--force-reset` seguinte derrubaria o inode debaixo da conexão aberta.
 *    Pior ainda seria criar o banco como efeito colateral do playwright.config.ts:
 *    ele é reavaliado em CADA worker, e um --force-reset por worker destruiria a
 *    corrida.
 * 2. LIMPEZA. Este é o processo mais externo: só apaga o arquivo depois que o
 *    Playwright já matou os dois webServer, e captura SIGINT/SIGTERM.
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = path.resolve(E2E_DIR, "..");
const SERVER_DIR = path.join(ROOT, "server");
const WEB_DIR = path.join(ROOT, "web");
const PRISMA_CLI = path.join(SERVER_DIR, "node_modules", "prisma", "build", "index.js");
const SCHEMA = path.join(SERVER_DIR, "prisma", "schema.prisma");
const PW_CLI = path.join(E2E_DIR, "node_modules", "@playwright", "test", "cli.js");

const argv = process.argv.slice(2);
const KEEP_DB = argv.includes("--keep-db") || !!process.env.E2E_KEEP_DB;
const pwArgs = argv.filter((a) => a !== "--keep-db");

const TMP_DIR = process.env.E2E_TMP_DIR ?? path.join(E2E_DIR, ".tmp");
const RUN_ID = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
// Caminho ABSOLUTO de propósito: `file:./x.db` resolve relativo ao diretório do
// schema.prisma para o CLI, mas relativo ao CWD para o client. Absoluto faz o
// CLI (rodando de e2e/), o servidor (de server/) e a limpeza verem o mesmo arquivo.
const DB_FILE = path.join(TMP_DIR, `smaug-e2e-${RUN_ID}.db`);
const DB_URL = `file:${DB_FILE}`;
const API_PORT = process.env.E2E_API_PORT ?? "3100";
const WEB_PORT = process.env.E2E_WEB_PORT ?? "3101";
const API_URL = `http://localhost:${API_PORT}`;
const WEB_MODE = process.env.E2E_WEB_MODE ?? (process.env.CI ? "build" : "dev");

const SIBLINGS = ["", "-journal", "-wal", "-shm"];
const die = (msg) => {
  console.error(`\n[e2e] ${msg}\n`);
  process.exit(1);
};

let cleaned = false;
function cleanup() {
  if (cleaned) return;
  cleaned = true;
  if (KEEP_DB) {
    console.log(`[e2e] --keep-db: banco preservado em ${DB_FILE}`);
    return;
  }
  for (const s of SIBLINGS) rmSync(DB_FILE + s, { force: true });
}

// --- 1. Guardas ------------------------------------------------------------
if (!existsSync(PRISMA_CLI)) die("Prisma não encontrado. Rode `npm run install:all` na raiz.");
if (!existsSync(PW_CLI)) die("Playwright não instalado. Rode `npm install --prefix e2e`.");
if (DB_FILE.includes(path.join("server", "prisma"))) {
  die("Recusando criar o banco de teste dentro de server/prisma.");
}

// A armadilha do prisma-prepare.mjs: se alguém rodou `prisma:prepare` sem
// DATABASE_PROVIDER, o schema versionado virou postgresql e o client gerado não
// fala SQLite. Falhar cedo, com a correção, em vez de um erro confuso em runtime.
const schemaSrc = readFileSync(SCHEMA, "utf8");
if (!/datasource\s+\w+\s*\{[\s\S]*?provider\s*=\s*"sqlite"/m.test(schemaSrc)) {
  die(
    'server/prisma/schema.prisma não está com provider = "sqlite".\n' +
      "Provavelmente `prisma:prepare` rodou sem DATABASE_PROVIDER. Reverta com:\n" +
      "  git checkout -- server/prisma/schema.prisma\n" +
      "  DATABASE_PROVIDER=sqlite npm run --prefix server prisma:generate",
  );
}

// --- 2. Poda de órfãos (Ctrl-C, crash, SIGKILL em runs anteriores) ---------
mkdirSync(TMP_DIR, { recursive: true });
for (const f of readdirSync(TMP_DIR)) {
  if (/^smaug-e2e-.*\.db(-journal|-wal|-shm)?$/.test(f)) {
    rmSync(path.join(TMP_DIR, f), { force: true });
  }
}

// --- 3. Cria e migra o banco exclusivo do run ------------------------------
// cwd = e2e/ de propósito: não existe .env aqui, então o CLI do Prisma não
// carrega server/.env por engano. --schema absoluto resolve o resto.
// NUNCA chamar prisma:prepare/generate: reescreveriam o schema versionado.
console.log(`[e2e] banco desta execução: ${DB_FILE}`);
const push = spawnSync(
  process.execPath,
  [PRISMA_CLI, "db", "push", "--schema", SCHEMA, "--force-reset", "--skip-generate"],
  {
    cwd: E2E_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: DB_URL,
      DATABASE_PROVIDER: "sqlite",
      PRISMA_HIDE_UPDATE_MESSAGE: "1",
      CHECKPOINT_DISABLE: "1",
    },
  },
);
if (push.status !== 0) {
  cleanup();
  die("`prisma db push` falhou.");
}

// --- 4. Build do front quando em modo "build" ------------------------------
// NEXT_PUBLIC_* é inlined em build time: precisa estar setado AQUI.
if (WEB_MODE === "build") {
  console.log("[e2e] next build (NEXT_PUBLIC_API_URL=" + API_URL + ")");
  const build = spawnSync("npm", ["run", "--prefix", WEB_DIR, "build"], {
    stdio: "inherit",
    env: { ...process.env, NEXT_PUBLIC_API_URL: API_URL },
    shell: process.platform === "win32",
  });
  if (build.status !== 0) {
    cleanup();
    die("`next build` falhou.");
  }
}

// --- 5. Playwright ---------------------------------------------------------
const child = spawn(process.execPath, [PW_CLI, "test", ...pwArgs], {
  cwd: E2E_DIR,
  stdio: "inherit",
  env: {
    ...process.env,
    E2E_RUN_ID: RUN_ID,
    E2E_DATABASE_URL: DB_URL,
    E2E_DB_FILE: DB_FILE,
    E2E_API_PORT: API_PORT,
    E2E_WEB_PORT: WEB_PORT,
    E2E_WEB_MODE: WEB_MODE,
    E2E_MANAGED_BY_WRAPPER: "1",
  },
});

// Ctrl-C manda o sinal para o GRUPO inteiro: o npm que nos envolve morre junto e
// pode nos derrubar antes de child.on("exit") rodar. Por isso limpamos DENTRO do
// handler, sem depender do callback de saída do filho.
//
// Apagar o arquivo com o servidor ainda vivo é seguro no Linux: o unlink sucede
// e o inode só é liberado no close. Do nosso lado o arquivo já sumiu.
let shuttingDown = false;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(sig, () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      child.kill(sig);
    } catch {
      // filho já morreu
    }
    cleanup();
    // Dá um instante para o Playwright derrubar os webServer antes de sairmos.
    setTimeout(() => process.exit(130), 2000).unref();
  });
}

child.on("exit", (code, signal) => {
  cleanup();
  process.exit(code ?? (signal ? 130 : 1));
});
process.on("exit", cleanup);
