#!/usr/bin/env node
/**
 * Cria uma migration com o MESMO nome em prisma/sqlite/migrations e em
 * prisma/postgresql/migrations, cada uma no dialeto do seu banco, a partir da
 * diferença entre o que as migrations já existentes produzem e prisma/schema.prisma.
 *
 *   npm run migrate:new -- <nome>        ex.: npm run migrate:new -- add_notes_to_expenses
 *
 * Não aplica nada: depois rode `npm run migrate:deploy`. O dialeto PostgreSQL
 * precisa de POSTGRES_SHADOW_DATABASE_URL.
 */
import fs from "node:fs";
import path from "node:path";
import {
  PROVIDERS,
  SERVER_DIR,
  diffMigrationsToSchema,
  fail,
  listMigrations,
  loadEnv,
  migrationsDir,
  parityProblems,
} from "./lib/prisma-env.mjs";

loadEnv();

const [name, ...rest] = process.argv.slice(2);
if (!name || rest.length > 0) fail("Uso: npm run migrate:new -- <nome_em_snake_case>");
if (!/^[a-z][a-z0-9_]*$/.test(name)) {
  fail(`Nome inválido: "${name}". Use snake_case minúsculo, ex.: add_notes_to_expenses.`);
}

const taken = PROVIDERS.flatMap((p) =>
  listMigrations(p)
    .filter((m) => m.endsWith(`_${name}`))
    .map((m) => `${p}/migrations/${m}`),
);
if (taken.length > 0) fail(`Já existe migration com o nome "${name}": ${taken.join(", ")}.`);

const problems = parityProblems();
if (problems.length > 0) {
  fail(
    `As pastas de migrations já divergem; corrija antes de criar outra:\n- ${problems.join("\n- ")}`,
  );
}

const diffs = PROVIDERS.map((provider) => ({ provider, ...diffMigrationsToSchema(provider) }));
if (diffs.every((d) => !d.changed)) {
  fail("prisma/schema.prisma não mudou em relação às migrations: nada a migrar.");
}

// Mesmo formato de pasta do `prisma migrate dev`: AAAAMMDDhhmmss_nome, em UTC.
const folder = `${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}_${name}`;
for (const { provider, script } of diffs) {
  const dir = path.join(migrationsDir(provider), folder);
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, "migration.sql"), script);
  console.log(`[prisma] criada ${path.relative(SERVER_DIR, dir)}/migration.sql`);
}
console.log("[prisma] Revise o SQL dos dois dialetos e aplique com `npm run migrate:deploy`.");
