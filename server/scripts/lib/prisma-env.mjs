/**
 * Base comum dos scripts do Prisma: ambiente, provider e schema derivado.
 *
 * `prisma/schema.prisma` é a fonte única dos models e nunca é reescrito. Cada
 * provider ganha uma cópia derivada em `prisma/<provider>/schema.prisma` (fora do
 * git) ao lado da sua pasta de migrations versionada — o Prisma 4 sempre procura
 * as migrations em `migrations/` junto do schema passado em `--schema`.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

export const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const PRISMA_DIR = path.join(SERVER_DIR, "prisma");
export const SOURCE_SCHEMA = path.join(PRISMA_DIR, "schema.prisma");
export const PROVIDERS = ["sqlite", "postgresql"];

const PRISMA_CLI = path.join(SERVER_DIR, "node_modules", "prisma", "build", "index.js");
const ACCEPTED = ["postgresql", "sqlite", "memory"];
const DATASOURCE_PROVIDER = /(datasource\s+\w+\s*\{[\s\S]*?provider\s*=\s*")[^"]+(")/m;

export function fail(message) {
  console.error(`\n[prisma] ${message}\n`);
  process.exit(1);
}

/** Sistema primeiro; `server/.env` só preenche o que faltar — a mesma regra do `env.ts`. */
export function loadEnv() {
  dotenv.config({ path: path.join(SERVER_DIR, ".env"), quiet: true });
}

/**
 * Caminho SQLite relativo parte de server/ — não da pasta do schema derivado, que
 * é como o Prisma o resolveria. O runtime aplica a mesma regra em `env.ts`.
 */
export function resolveSqliteUrl(url) {
  if (!url.startsWith("file:")) return url;
  const location = url.slice("file:".length);
  const queryStart = location.indexOf("?");
  const file = queryStart === -1 ? location : location.slice(0, queryStart);
  const query = queryStart === -1 ? "" : location.slice(queryStart);
  if (path.isAbsolute(file)) return url;
  return `file:${path.resolve(SERVER_DIR, file)}${query}`;
}

export function resolveProvider() {
  const raw = process.env.DATABASE_PROVIDER;
  if (raw === undefined) {
    fail(
      "DATABASE_PROVIDER não está definida.\n" +
        "Defina no ambiente ou em server/.env (copie de server/.env.example).\n" +
        `Valores aceitos: ${ACCEPTED.join(", ")}.`,
    );
  }
  if (!ACCEPTED.includes(raw)) {
    fail(`DATABASE_PROVIDER="${raw}" é inválida. Valores aceitos: ${ACCEPTED.join(", ")}.`);
  }
  // `memory` não tem banco; os comandos do Prisma tratam como SQLite.
  return raw === "memory" ? "sqlite" : raw;
}

export const schemaPath = (provider) => path.join(PRISMA_DIR, provider, "schema.prisma");
export const migrationsDir = (provider) => path.join(PRISMA_DIR, provider, "migrations");

export function writeProviderSchema(provider) {
  const source = fs.readFileSync(SOURCE_SCHEMA, "utf8");
  if (!DATASOURCE_PROVIDER.test(source)) {
    fail("Não encontrei o `provider` do datasource em prisma/schema.prisma.");
  }
  const derived =
    "// GERADO a partir de prisma/schema.prisma pelos scripts de server/scripts/.\n" +
    "// Não edite nem versione: é sobrescrito a cada comando.\n\n" +
    source.replace(DATASOURCE_PROVIDER, (_, prefix, suffix) => `${prefix}${provider}${suffix}`);

  const target = schemaPath(provider);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  // Escrita atômica: processos paralelos podem ler este arquivo enquanto ele é regravado.
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, derived);
  fs.renameSync(tmp, target);
  return target;
}

export function runPrisma(args, { capture = false } = {}) {
  const result = spawnSync(process.execPath, [PRISMA_CLI, ...args], {
    cwd: SERVER_DIR,
    stdio: capture ? "pipe" : "inherit",
    encoding: "utf8",
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
  });
  if (result.error) fail(`Falha ao executar o Prisma: ${result.error.message}`);
  return result;
}

export function listMigrations(provider) {
  const dir = migrationsDir(provider);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/** Problemas de paridade entre as pastas: migrations órfãs e locks de provider errado. */
export function parityProblems() {
  const problems = [];
  const [a, b] = PROVIDERS;
  const names = Object.fromEntries(PROVIDERS.map((p) => [p, new Set(listMigrations(p))]));

  for (const [from, to] of [
    [a, b],
    [b, a],
  ]) {
    for (const name of names[from]) {
      if (!names[to].has(name)) problems.push(`"${name}" existe em ${from} e falta em ${to}.`);
    }
  }

  for (const provider of PROVIDERS) {
    const lock = path.join(migrationsDir(provider), "migration_lock.toml");
    const content = fs.existsSync(lock) ? fs.readFileSync(lock, "utf8") : "";
    if (!new RegExp(`provider\\s*=\\s*"${provider}"`).test(content)) {
      problems.push(`${path.relative(SERVER_DIR, lock)} ausente ou sem provider = "${provider}".`);
    }
  }
  return problems;
}

/**
 * Banco sombra para `migrate diff --from-migrations`: o Prisma aplica as
 * migrations nele para descobrir o estado que elas produzem, e o apaga antes.
 */
export function shadowDatabaseUrl(provider) {
  if (provider === "sqlite") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smaug-shadow-"));
    process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
    return `file:${path.join(dir, "shadow.db")}`;
  }
  const url = process.env.POSTGRES_SHADOW_DATABASE_URL;
  if (!url) {
    fail(
      "POSTGRES_SHADOW_DATABASE_URL não está definida — o dialeto PostgreSQL precisa de um\n" +
        "banco sombra descartável (ele é APAGADO a cada uso; nunca aponte para um banco com dados).\n" +
        "Com o Postgres do docker-compose (`docker compose up -d postgres` em server/):\n" +
        "  POSTGRES_SHADOW_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smaug_shadow",
    );
  }
  return url;
}

/** O `migrate diff` não cria o banco sombra; criamos pela base `postgres` do mesmo servidor. */
function createPostgresDatabase(url) {
  const target = new URL(url);
  const name = decodeURIComponent(target.pathname.slice(1));
  const maintenance = new URL(url);
  maintenance.pathname = "/postgres";
  maintenance.search = "";
  console.log(`[prisma] criando o banco sombra "${name}"…`);
  const result = spawnSync(
    process.execPath,
    [PRISMA_CLI, "db", "execute", "--url", maintenance.toString(), "--stdin"],
    {
      cwd: SERVER_DIR,
      input: `CREATE DATABASE "${name.replaceAll('"', '""')}";`,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) fail(`Não consegui criar o banco sombra "${name}":\n${result.stderr}`);
}

/** Diferença entre o que as migrations produzem e o schema de origem, no dialeto do provider. */
export function diffMigrationsToSchema(provider) {
  const shadow = shadowDatabaseUrl(provider);
  const args = [
    "migrate",
    "diff",
    "--from-migrations",
    migrationsDir(provider),
    "--to-schema-datamodel",
    writeProviderSchema(provider),
    "--shadow-database-url",
    shadow,
    "--script",
    "--exit-code",
  ];
  let result = runPrisma(args, { capture: true });
  // P1003: o banco não existe no servidor.
  if (provider === "postgresql" && result.status === 1 && result.stderr.includes("P1003")) {
    createPostgresDatabase(shadow);
    result = runPrisma(args, { capture: true });
  }
  // --exit-code: 0 = sem diferença, 2 = há diferença, qualquer outro = erro.
  if (result.status !== 0 && result.status !== 2) {
    fail(`\`prisma migrate diff\` falhou para ${provider}:\n${result.stderr || result.stdout}`);
  }
  return { changed: result.status === 2, script: result.stdout };
}
