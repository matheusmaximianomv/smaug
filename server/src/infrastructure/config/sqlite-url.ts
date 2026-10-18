import path from "node:path";

/**
 * Um caminho SQLite relativo parte de lugares diferentes: o CLI do Prisma 7 o resolve
 * a partir da pasta da config (prisma/), e o `better-sqlite3`, do diretório corrente.
 * Tornamos o caminho absoluto a partir do diretório de onde o `.env` é lido (server/),
 * a mesma regra de server/scripts/lib/prisma-env.mjs.
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
