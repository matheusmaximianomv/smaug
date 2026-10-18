import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "@src/infrastructure/database/prisma-adapter.ts";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SQLITE_FILE_SUFFIXES = ["", "-journal", "-wal", "-shm"];

export interface SqliteTestDatabase {
  /** URL absoluta: CLI, client do teste e app precisam abrir o mesmo arquivo. */
  url: string;
  /** Cria o banco do zero com o schema SQLite, pelo wrapper do Prisma. */
  push(): void;
  /** Client do teste, com o mesmo driver adapter da aplicação. */
  client(): PrismaClient;
  /** Apaga o arquivo e os auxiliares que o SQLite deixa ao lado dele. */
  remove(): void;
}

/**
 * Banco SQLite exclusivo de um arquivo de teste de integração, em
 * `prisma/sqlite/test-<name>.db`.
 *
 * O `push()` apaga o arquivo antes em vez de usar `db push --force-reset`: o CLI do
 * Prisma 7 recusa ações destrutivas quando detecta um agente de IA no ambiente, e um
 * arquivo novo já dispensa o reset. Ir pelo wrapper também tira dos testes o caminho
 * do schema derivado.
 */
export function sqliteTestDatabase(name: string): SqliteTestDatabase {
  const file = path.join(SERVER_DIR, "prisma", "sqlite", `test-${name}.db`);
  const url = `file:${file}`;

  const remove = (): void => {
    for (const suffix of SQLITE_FILE_SUFFIXES) rmSync(`${file}${suffix}`, { force: true });
  };

  return {
    url,
    push() {
      remove();
      execFileSync(process.execPath, ["scripts/prisma.mjs", "db", "push"], {
        cwd: SERVER_DIR,
        env: { ...process.env, DATABASE_PROVIDER: "sqlite", DATABASE_URL: url },
        stdio: "pipe",
      });
    },
    client() {
      return new PrismaClient({ adapter: createPrismaAdapter("sqlite", url) });
    },
    remove,
  };
}
