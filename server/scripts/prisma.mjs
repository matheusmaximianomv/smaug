#!/usr/bin/env node
/**
 * Roda o CLI do Prisma contra o schema e as migrations do provider resolvido.
 *
 *   node scripts/prisma.mjs                  só gera prisma/<provider>/schema.prisma
 *   node scripts/prisma.mjs generate         client do provider
 *   node scripts/prisma.mjs migrate deploy   aplica prisma/<provider>/migrations
 *   node scripts/prisma.mjs studio           qualquer outro comando do CLI
 *
 * DATABASE_PROVIDER e DATABASE_URL vêm do ambiente e, na falta, de server/.env.
 */
import path from "node:path";
import {
  SERVER_DIR,
  fail,
  loadEnv,
  resolveProvider,
  resolveSqliteUrl,
  runPrisma,
  writeProviderSchema,
} from "./lib/prisma-env.mjs";

const args = process.argv.slice(2);

if (args.includes("--schema")) {
  fail("Não passe --schema: o schema é escolhido por DATABASE_PROVIDER.");
}
if (args[0] === "migrate" && args[1] === "dev") {
  fail(
    "`migrate dev` criaria a migration só no dialeto atual.\n" +
      "Use `npm run migrate:new -- <nome>` (cria nos dois) e depois `npm run migrate:deploy`.",
  );
}

loadEnv();
const provider = resolveProvider();
const schema = writeProviderSchema(provider);

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolveSqliteUrl(process.env.DATABASE_URL);
}

if (args.length === 0) {
  console.log(`[prisma] ${path.relative(SERVER_DIR, schema)} gerado (${provider}).`);
  process.exit(0);
}

console.log(`[prisma] provider: ${provider}`);
// `migrate diff` não aceita --schema: os lados vêm nas próprias flags dele.
const isDiff = args[0] === "migrate" && args[1] === "diff";
process.exit(runPrisma(isDiff ? args : [...args, "--schema", schema]).status ?? 1);
