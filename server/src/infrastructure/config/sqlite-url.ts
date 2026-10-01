import path from "node:path";

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
