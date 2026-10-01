#!/usr/bin/env node
/**
 * Verifica as duas pastas de migrations (é o que o CI roda):
 *
 * 1. paridade — os mesmos nomes nas duas pastas, cada uma com o lock do seu provider;
 * 2. fidelidade — as migrations de cada provider reproduzem prisma/schema.prisma.
 *
 *   node scripts/migrate-check.mjs [sqlite|postgresql ...]   (padrão: os dois)
 *
 * O dialeto PostgreSQL precisa de POSTGRES_SHADOW_DATABASE_URL.
 */
import {
  PROVIDERS,
  diffMigrationsToSchema,
  fail,
  loadEnv,
  parityProblems,
} from "./lib/prisma-env.mjs";

loadEnv();

const requested = process.argv.slice(2);
const invalid = requested.filter((p) => !PROVIDERS.includes(p));
if (invalid.length > 0)
  fail(`Provider desconhecido: ${invalid.join(", ")}. Use ${PROVIDERS.join(" ou ")}.`);
const providers = requested.length > 0 ? requested : PROVIDERS;

const problems = parityProblems();

for (const provider of providers) {
  const { changed, script } = diffMigrationsToSchema(provider);
  if (changed) {
    problems.push(
      `As migrations de ${provider} não reproduzem prisma/schema.prisma. Falta:\n\n${script.trim()}\n\n` +
        "Crie a migration com `npm run migrate:new -- <nome>`.",
    );
  } else {
    console.log(`[prisma] ${provider}: migrations em dia com o schema.`);
  }
}

if (problems.length > 0) fail(problems.map((p) => `- ${p}`).join("\n"));
console.log("[prisma] pastas de migrations em paridade.");
