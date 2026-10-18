import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";

export const NOW = new Date("2026-10-18T12:00:00.000Z");
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** `n` segundos depois de `NOW` (negativo para antes). */
export function at(seconds: number): Date {
  return new Date(NOW.getTime() + seconds * 1000);
}

/** Usuário gravado direto pelo client, com id e e-mail únicos (o banco do Postgres não é recriado). */
export async function insertUser(prisma: PrismaClient): Promise<string> {
  const id = randomUUID();
  await prisma.user.create({ data: { id, name: "Smaug", email: `${id}@smaug.test` } });
  return id;
}

export function startSession(userId: string, now: Date = NOW): AuthSession {
  return AuthSession.start(userId, "password", now, SESSION_LIFETIME_MS);
}

export function issueToken(
  session: AuthSession,
  parentTokenId: string | null = null,
  now: Date = NOW,
  ttlMs: number = REFRESH_TTL_MS,
): RefreshToken {
  return RefreshToken.issue(session, `hash-${randomUUID()}`, parentTokenId, now, ttlMs);
}
