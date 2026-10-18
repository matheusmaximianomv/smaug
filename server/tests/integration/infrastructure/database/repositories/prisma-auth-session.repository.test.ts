import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaAuthSessionRepository } from "@src/infrastructure/database/repositories/prisma-auth-session.repository";
import { sqliteTestDatabase } from "../../../../helpers/sqlite-test-database";
import {
  NOW,
  SESSION_LIFETIME_MS,
  at,
  insertUser,
  issueToken,
  startSession,
} from "../../../../helpers/auth-session-fixtures";

const testDb = sqliteTestDatabase("auth-repo-session");

describe("PrismaAuthSessionRepository", () => {
  let prisma: PrismaClient;
  let repository: PrismaAuthSessionRepository;
  let userId: string;

  beforeAll(() => {
    testDb.push();
    prisma = testDb.client();
    repository = new PrismaAuthSessionRepository(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    testDb.remove();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    userId = await insertUser(prisma);
  });

  async function persistedSession(now: Date = NOW) {
    const session = startSession(userId, now);
    const token = issueToken(session, null, now);
    await repository.create(session, token);
    return { session, token };
  }

  describe("create / findSessionById", () => {
    it("should persist the session and its first token together", async () => {
      const { session, token } = await persistedSession();

      expect(await repository.findSessionById(session.id)).toEqual(session);
      const tokens = await prisma.refreshToken.findMany({ where: { sessionId: session.id } });
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toMatchObject({
        id: token.id,
        tokenHash: token.tokenHash,
        parentTokenId: null,
        status: "ACTIVE",
      });
    });

    it("should return null when the session does not exist", async () => {
      expect(await repository.findSessionById("missing")).toBeNull();
    });

    it("should rehydrate a revoked session with its reason", async () => {
      const { session } = await persistedSession();
      await repository.revokeSession(session.id, "LOGOUT", at(10));

      const found = await repository.findSessionById(session.id);

      expect(found).toMatchObject({ status: "REVOKED", revokedReason: "LOGOUT" });
      expect(found?.revokedAt).toEqual(at(10));
    });
  });

  describe("findTokenByHash", () => {
    it("should return the token with its session", async () => {
      const { session, token } = await persistedSession();

      const found = await repository.findTokenByHash(token.tokenHash);

      expect(found).toEqual({ token, session });
    });

    it("should return null for an unknown hash", async () => {
      expect(await repository.findTokenByHash("unknown")).toBeNull();
    });
  });

  describe("rotate", () => {
    it("should mark the current token ROTATED, store the successor and touch the session", async () => {
      const { session, token } = await persistedSession();
      const next = issueToken(session, token.id, at(60));

      expect(await repository.rotate(token.id, next, at(60))).toBe(true);

      const current = await repository.findTokenByHash(token.tokenHash);
      expect(current?.token).toMatchObject({ status: "ROTATED", rotatedAt: at(60) });
      const successor = await repository.findTokenByHash(next.tokenHash);
      expect(successor?.token).toEqual(next);
      expect(successor?.session.lastUsedAt).toEqual(at(60));
    });

    it("should link the successor to the current token even if next says otherwise", async () => {
      const { session, token } = await persistedSession();
      const next = issueToken(session, null, at(60));

      await repository.rotate(token.id, next, at(60));

      const successor = await repository.findTokenByHash(next.tokenHash);
      expect(successor?.token.parentTokenId).toBe(token.id);
    });

    it("should return false and change nothing when the session was revoked", async () => {
      const { session, token } = await persistedSession();
      await repository.revokeSession(session.id, "LOGOUT", at(10));

      const ok = await repository.rotate(token.id, issueToken(session, token.id, at(60)), at(60));

      expect(ok).toBe(false);
      expect(await prisma.refreshToken.count({ where: { sessionId: session.id } })).toBe(1);
    });

    it("should return false when the session has expired", async () => {
      const { session, token } = await persistedSession();
      const afterLifetime = new Date(NOW.getTime() + SESSION_LIFETIME_MS);

      const ok = await repository.rotate(
        token.id,
        issueToken(session, token.id, at(1)),
        afterLifetime,
      );

      expect(ok).toBe(false);
    });

    it("should return false and keep lastUsedAt when the token was already rotated", async () => {
      const { session, token } = await persistedSession();
      await repository.rotate(token.id, issueToken(session, token.id, at(60)), at(60));

      const ok = await repository.rotate(token.id, issueToken(session, token.id, at(90)), at(90));

      expect(ok).toBe(false);
      expect((await repository.findSessionById(session.id))?.lastUsedAt).toEqual(at(60));
      expect(await prisma.refreshToken.count({ where: { sessionId: session.id } })).toBe(2);
    });

    it("should return false when the token has expired", async () => {
      const { session, token } = await persistedSession();

      const ok = await repository.rotate(
        token.id,
        issueToken(session, token.id, token.expiresAt),
        token.expiresAt,
      );

      expect(ok).toBe(false);
    });

    it("should return false when the token belongs to another session", async () => {
      const { token } = await persistedSession();
      const { session: other } = await persistedSession();

      const ok = await repository.rotate(token.id, issueToken(other, token.id, at(60)), at(60));

      expect(ok).toBe(false);
      expect((await repository.findTokenByHash(token.tokenHash))?.token.status).toBe("ACTIVE");
    });

    it("should roll back the CAS when a successor already exists for the parent", async () => {
      const { session, token } = await persistedSession();
      const orphan = issueToken(session, token.id, at(30));
      await prisma.refreshToken.create({
        data: {
          id: orphan.id,
          sessionId: session.id,
          tokenHash: orphan.tokenHash,
          parentTokenId: token.id,
          status: "ACTIVE",
          createdAt: orphan.createdAt,
          expiresAt: orphan.expiresAt,
        },
      });

      const ok = await repository.rotate(token.id, issueToken(session, token.id, at(60)), at(60));

      expect(ok).toBe(false);
      expect((await repository.findTokenByHash(token.tokenHash))?.token).toMatchObject({
        status: "ACTIVE",
        rotatedAt: null,
      });
      expect((await repository.findSessionById(session.id))?.lastUsedAt).toEqual(NOW);
    });

    it("should rethrow unexpected failures", async () => {
      const { session, token } = await persistedSession();
      const failure = new Error("connection lost");
      vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(failure);

      await expect(
        repository.rotate(token.id, issueToken(session, token.id, at(60)), at(60)),
      ).rejects.toBe(failure);
    });
  });

  it("should refuse a second child with the same parentTokenId", async () => {
    const { session, token } = await persistedSession();
    const childData = (hash: string, id: string) => ({
      id,
      sessionId: session.id,
      tokenHash: hash,
      parentTokenId: token.id,
      status: "ACTIVE",
      createdAt: NOW,
      expiresAt: at(3600),
    });
    await prisma.refreshToken.create({ data: childData(`${token.id}-a`, `${token.id}-child-a`) });

    await expect(
      prisma.refreshToken.create({ data: childData(`${token.id}-b`, `${token.id}-child-b`) }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  describe("revokeSession", () => {
    it("should revoke the session and its ACTIVE tokens, keeping ROTATED ones", async () => {
      const { session, token } = await persistedSession();
      const next = issueToken(session, token.id, at(60));
      await repository.rotate(token.id, next, at(60));

      await repository.revokeSession(session.id, "REFRESH_TOKEN_REUSE", at(120));

      const revoked = await repository.findSessionById(session.id);
      expect(revoked).toMatchObject({ status: "REVOKED", revokedReason: "REFRESH_TOKEN_REUSE" });
      expect((await repository.findTokenByHash(token.tokenHash))?.token).toMatchObject({
        status: "ROTATED",
        revokedAt: null,
      });
      expect((await repository.findTokenByHash(next.tokenHash))?.token).toMatchObject({
        status: "REVOKED",
        revokedAt: at(120),
      });
    });

    it("should keep the first revocation date and reason when called again", async () => {
      const { session } = await persistedSession();
      await repository.revokeSession(session.id, "LOGOUT", at(10));

      await repository.revokeSession(session.id, "LOGOUT_ALL", at(20));

      const revoked = await repository.findSessionById(session.id);
      expect(revoked).toMatchObject({ revokedReason: "LOGOUT", revokedAt: at(10) });
    });
  });

  describe("revokeAllForUser", () => {
    it("should revoke every ACTIVE session of the user and their tokens, and nobody else's", async () => {
      const first = await persistedSession();
      const second = await persistedSession();
      const alreadyRevoked = await persistedSession();
      await repository.revokeSession(alreadyRevoked.session.id, "LOGOUT", at(5));
      const owner = userId;
      userId = await insertUser(prisma);
      const stranger = await persistedSession();

      await repository.revokeAllForUser(owner, "LOGOUT_ALL", at(30));

      for (const { session, token } of [first, second]) {
        expect(await repository.findSessionById(session.id)).toMatchObject({
          status: "REVOKED",
          revokedReason: "LOGOUT_ALL",
          revokedAt: at(30),
        });
        expect((await repository.findTokenByHash(token.tokenHash))?.token.status).toBe("REVOKED");
      }
      expect(await repository.findSessionById(alreadyRevoked.session.id)).toMatchObject({
        revokedReason: "LOGOUT",
        revokedAt: at(5),
      });
      expect((await repository.findSessionById(stranger.session.id))?.status).toBe("ACTIVE");
      expect((await repository.findTokenByHash(stranger.token.tokenHash))?.token.status).toBe(
        "ACTIVE",
      );
    });
  });

  describe("deleteStaleForUser", () => {
    it("should delete expired and long-revoked sessions with their tokens only", async () => {
      const expired = await persistedSession(new Date(NOW.getTime() - SESSION_LIFETIME_MS - 1000));
      const longRevoked = await persistedSession(at(-3600));
      await repository.revokeSession(longRevoked.session.id, "LOGOUT", at(-1800));
      const recentlyRevoked = await persistedSession();
      await repository.revokeSession(recentlyRevoked.session.id, "LOGOUT", at(10));
      const active = await persistedSession();
      const owner = userId;
      userId = await insertUser(prisma);
      const strangerExpired = await persistedSession(
        new Date(NOW.getTime() - SESSION_LIFETIME_MS - 1000),
      );

      await repository.deleteStaleForUser(owner, NOW);

      expect(await repository.findSessionById(expired.session.id)).toBeNull();
      expect(await repository.findSessionById(longRevoked.session.id)).toBeNull();
      expect(await repository.findTokenByHash(expired.token.tokenHash)).toBeNull();
      expect(await repository.findTokenByHash(longRevoked.token.tokenHash)).toBeNull();
      expect(await repository.findSessionById(recentlyRevoked.session.id)).not.toBeNull();
      expect(await repository.findSessionById(active.session.id)).not.toBeNull();
      expect(await repository.findSessionById(strangerExpired.session.id)).not.toBeNull();
    });
  });
});
