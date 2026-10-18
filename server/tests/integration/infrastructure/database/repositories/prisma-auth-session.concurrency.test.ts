import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { createPrismaAdapter } from "@src/infrastructure/database/prisma-adapter.ts";
import { PrismaAuthSessionRepository } from "@src/infrastructure/database/repositories/prisma-auth-session.repository";
import { PrismaUserRepository } from "@src/infrastructure/database/repositories/prisma-user.repository";
import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "@src/domain/errors/domain-error";
import { sqliteTestDatabase } from "../../../../helpers/sqlite-test-database";
import {
  at,
  insertUser,
  issueToken,
  startSession,
} from "../../../../helpers/auth-session-fixtures";

/**
 * As garantias de `rotate` (§8.3 da especificação) valem por banco: o PostgreSQL reavalia o
 * `WHERE` depois de esperar o lock da linha, o SQLite serializa as escritas. Por isso a mesma
 * bateria roda nos dois. O client gerado é de UM provider por vez: o SQLite roda quando o
 * client é dele; o PostgreSQL roda quando há `POSTGRES_TEST_DATABASE_URL` (o job `migrations`
 * do CI aponta para o seu serviço) e, aí, exige o client PostgreSQL — com outro client a
 * construção falha alto, em vez de o CI passar sem ter testado nada.
 */
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const CLIENT_SCHEMA = path.join(SERVER_DIR, "node_modules", ".prisma", "client", "schema.prisma");
const POSTGRES_URL = process.env.POSTGRES_TEST_DATABASE_URL;
const PARALLEL_REFRESHES = 10;
const RACE_ROUNDS = 10;

function generatedClientProvider(): string | null {
  if (!existsSync(CLIENT_SCHEMA)) return null;
  const match = /datasource\s+\w+\s*{[^}]*provider\s*=\s*"(\w+)"/.exec(
    readFileSync(CLIENT_SCHEMA, "utf8"),
  );
  return match ? match[1] : null;
}

interface Target {
  name: string;
  enabled: boolean;
  open(): PrismaClient;
  close(): void;
}

const sqlite = sqliteTestDatabase("auth-repo-concurrency");
const clientProvider = generatedClientProvider();

const targets: Target[] = [
  {
    name: "SQLite",
    enabled: clientProvider === "sqlite",
    open() {
      sqlite.push();
      return sqlite.client();
    },
    close: () => sqlite.remove(),
  },
  {
    name: "PostgreSQL",
    enabled: Boolean(POSTGRES_URL),
    // `migrate deploy` não apaga nada (e cria o banco se faltar): os testes usam usuários
    // novos a cada caso, então rodar de novo sobre o mesmo banco é seguro.
    open() {
      const url = POSTGRES_URL as string;
      execFileSync(process.execPath, ["scripts/prisma.mjs", "migrate", "deploy"], {
        cwd: SERVER_DIR,
        env: { ...process.env, DATABASE_PROVIDER: "postgresql", DATABASE_URL: url },
        stdio: "pipe",
      });
      return new PrismaClient({ adapter: createPrismaAdapter("postgresql", url) });
    },
    close: () => undefined,
  },
];

for (const target of targets) {
  describe.skipIf(!target.enabled)(
    `PrismaAuthSessionRepository concurrency (${target.name})`,
    () => {
      let prisma: PrismaClient;
      let repository: PrismaAuthSessionRepository;

      beforeAll(() => {
        prisma = target.open();
        repository = new PrismaAuthSessionRepository(prisma);
      });

      afterAll(async () => {
        await prisma.$disconnect();
        target.close();
      });

      async function persistedSession() {
        const session = startSession(await insertUser(prisma));
        const token = issueToken(session);
        await repository.create(session, token);
        return { session, token };
      }

      it(`should let exactly one of ${PARALLEL_REFRESHES} simultaneous rotations win`, async () => {
        const { session, token } = await persistedSession();

        const results = await Promise.all(
          Array.from({ length: PARALLEL_REFRESHES }, () =>
            repository.rotate(token.id, issueToken(session, token.id, at(60)), at(60)),
          ),
        );

        expect(results.filter(Boolean)).toHaveLength(1);
        const tokens = await prisma.refreshToken.findMany({ where: { sessionId: session.id } });
        expect(tokens).toHaveLength(2);
        expect(tokens.filter((t) => t.status === "ACTIVE")).toHaveLength(1);
        expect((await repository.findSessionById(session.id))?.status).toBe("ACTIVE");
      });

      it("should never leave an ACTIVE token in a REVOKED session when rotate races revokeSession", async () => {
        for (let round = 0; round < RACE_ROUNDS; round++) {
          const { session, token } = await persistedSession();
          const next = issueToken(session, token.id, at(60));

          const [rotated] = await Promise.all([
            repository.rotate(token.id, next, at(60)),
            repository.revokeSession(session.id, "LOGOUT", at(60)),
          ]);

          expect(typeof rotated).toBe("boolean");
          expect((await repository.findSessionById(session.id))?.status).toBe("REVOKED");
          const active = await prisma.refreshToken.count({
            where: { sessionId: session.id, status: "ACTIVE" },
          });
          expect(active).toBe(0);
        }
      });

      it("should refuse a second child with the same parentTokenId", async () => {
        const { session, token } = await persistedSession();
        const child = (suffix: string) => ({
          id: `${token.id}-${suffix}`,
          sessionId: session.id,
          tokenHash: `${token.tokenHash}-${suffix}`,
          parentTokenId: token.id,
          status: "ACTIVE",
          createdAt: at(1),
          expiresAt: at(3600),
        });
        await prisma.refreshToken.create({ data: child("a") });

        await expect(prisma.refreshToken.create({ data: child("b") })).rejects.toMatchObject({
          code: "P2002",
        });
      });

      it("should turn a registration race on the same email into one EmailAlreadyExistsError", async () => {
        const users = new PrismaUserRepository(prisma);
        const email = `${crypto.randomUUID()}@smaug.test`;
        const attempt = () => {
          const user = User.create({ name: "Smaug", email });
          const credential = PasswordCredential.create({
            userId: user.id,
            passwordHash: "$argon2id$hash",
            pepperId: "test",
          });
          return users.createWithPasswordCredential(user, credential);
        };

        const results = await Promise.allSettled([attempt(), attempt()]);

        expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
        const rejected = results.find((r) => r.status === "rejected");
        expect(rejected?.reason).toBeInstanceOf(EmailAlreadyExistsError);
      });
    },
  );
}
