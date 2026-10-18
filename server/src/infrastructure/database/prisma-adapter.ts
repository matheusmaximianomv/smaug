import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";

export type PrismaAdapterProvider = "sqlite" | "postgresql";

/**
 * Driver adapter do Prisma 7 para o provider. Não lê o `env.ts`, para que o harness
 * de integração monte o client com exatamente o mesmo adapter da aplicação.
 *
 * As duas opções preservam o comportamento do engine do Prisma 4, medidos no upgrade:
 * - `connectionTimeoutMillis`: o `pg` não tem timeout de conexão por padrão e, com o
 *   host inalcançável, o `/health` ficava pendurado por mais de 30 s em vez do 503 em
 *   ~5 s do engine (e do `--timeout=5s` do HEALTHCHECK do Docker).
 * - `unixepoch-ms`: o Prisma 4 gravava `DateTime` no SQLite como INTEGER em ms; o
 *   padrão do adapter (`iso8601`) grava TEXT, e o SQLite ordena todo INTEGER antes de
 *   qualquer TEXT — um `dev.db` existente misturaria formatos e quebraria `orderBy`.
 */
export function createPrismaAdapter(
  provider: PrismaAdapterProvider,
  url: string,
): PrismaPg | PrismaBetterSqlite3 {
  if (provider === "postgresql") {
    return new PrismaPg({ connectionString: url, connectionTimeoutMillis: 5_000 });
  }
  return new PrismaBetterSqlite3({ url }, { timestampFormat: "unixepoch-ms" });
}
