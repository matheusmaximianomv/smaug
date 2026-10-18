/**
 * Config do CLI do Prisma 7, passada em `--config` por `scripts/prisma.mjs`.
 *
 * Mora em `prisma/`, e não na raiz do server (onde o CLI a acharia sozinho), porque o
 * estágio `runner` do Dockerfile só copia `scripts/`, `prisma/` e `dist/`: na raiz ela
 * não chegaria à imagem e o `migrate:deploy` do contêiner ficaria sem URL.
 *
 * Caminhos relativos partem desta pasta. O provider vem do wrapper, que já resolveu
 * DATABASE_PROVIDER (ambiente, depois server/.env) e gravou o schema derivado.
 */
import { defineConfig } from "prisma/config";

const provider = process.env.SMAUG_PRISMA_PROVIDER;
if (!provider) {
  throw new Error(
    "Rode o CLI do Prisma pelos scripts do server (`npm run --prefix server prisma -- <args>`, " +
      "`prisma:generate`, `migrate:deploy`…): eles escolhem o provider e o schema derivado.",
  );
}

export default defineConfig({
  schema: `${provider}/schema.prisma`,
  migrations: { path: `${provider}/migrations` },
  datasource: {
    // Vazio, e não `env("DATABASE_URL")`: o helper lança sem a variável, e o
    // `prisma:generate` do CI roda sem DATABASE_URL.
    url: process.env.DATABASE_URL ?? "",
    shadowDatabaseUrl: process.env.SMAUG_SHADOW_DATABASE_URL,
  },
});
