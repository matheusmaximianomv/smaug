import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * O Prisma resolve caminho SQLite relativo a partir da pasta do schema gerado
 * (prisma/sqlite/). Tornamos o caminho absoluto a partir do diretório de onde o
 * `.env` é lido (server/), a mesma regra de server/scripts/lib/prisma-env.mjs.
 */
export function resolveSqliteUrl(url: string, baseDir: string = process.cwd()): string {
  if (!url.startsWith("file:")) return url;
  const location = url.slice("file:".length);
  const queryStart = location.indexOf("?");
  const file = queryStart === -1 ? location : location.slice(0, queryStart);
  const query = queryStart === -1 ? "" : location.slice(queryStart);
  if (path.isAbsolute(file)) return url;
  return `file:${path.resolve(baseDir, file)}${query}`;
}

const envSchema = z
  .object({
    DATABASE_PROVIDER: z.enum(["postgresql", "sqlite", "memory"]),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL must not be empty")
      .transform((url) => resolveSqliteUrl(url)),
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z
      .string()
      .default("3000")
      .transform((val) => Number(val))
      .pipe(z.number().int().min(1).max(65535)),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    CORS_ORIGIN: z.string().default("http://localhost:3001"),
  })
  .passthrough();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment validation failed:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type EnvConfig = typeof env;
