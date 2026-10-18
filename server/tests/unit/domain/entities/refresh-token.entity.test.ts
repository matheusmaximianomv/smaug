import { describe, it, expect } from "vitest";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken, type RefreshTokenRecord } from "@src/domain/entities/refresh-token.entity";

const NOW = new Date("2026-05-01T10:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const TTL_MS = 7 * DAY_MS;
const SESSION_LIFETIME_MS = 30 * DAY_MS;
const GRACE_MS = 30_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

const session = AuthSession.start("user-1", "password", NOW, SESSION_LIFETIME_MS);

const record: RefreshTokenRecord = {
  id: "token-2",
  sessionId: "session-1",
  tokenHash: "b".repeat(64),
  parentTokenId: "token-1",
  status: "ROTATED",
  createdAt: NOW,
  expiresAt: at(TTL_MS),
  rotatedAt: at(1_000),
  revokedAt: null,
};

describe("RefreshToken", () => {
  describe("issue", () => {
    it("should issue an active token bound to the session when issued", () => {
      const token = RefreshToken.issue(session, "a".repeat(64), null, NOW, TTL_MS);

      expect(token.id).toMatch(UUID);
      expect(token.sessionId).toBe(session.id);
      expect(token.tokenHash).toBe("a".repeat(64));
      expect(token.parentTokenId).toBeNull();
      expect(token.status).toBe("ACTIVE");
      expect(token.createdAt).toBe(NOW);
      expect(token.rotatedAt).toBeNull();
      expect(token.revokedAt).toBeNull();
    });

    it("should keep the parent token id when issued by a rotation", () => {
      const token = RefreshToken.issue(session, "a".repeat(64), "token-1", NOW, TTL_MS);
      expect(token.parentTokenId).toBe("token-1");
    });

    it("should expire after the TTL when the session outlives it", () => {
      const token = RefreshToken.issue(session, "a".repeat(64), null, NOW, TTL_MS);
      expect(token.expiresAt).toEqual(at(TTL_MS));
    });

    it("should be capped at the session expiration when the TTL goes past it", () => {
      const issuedAt = at(SESSION_LIFETIME_MS - DAY_MS);
      const token = RefreshToken.issue(session, "a".repeat(64), null, issuedAt, TTL_MS);
      expect(token.expiresAt).toEqual(session.expiresAt);
    });

    it("should expire exactly with the session when both limits coincide", () => {
      const issuedAt = at(SESSION_LIFETIME_MS - TTL_MS);
      const token = RefreshToken.issue(session, "a".repeat(64), null, issuedAt, TTL_MS);
      expect(token.expiresAt).toEqual(session.expiresAt);
    });

    it("should throw when the token hash is empty", () => {
      expect(() => RefreshToken.issue(session, "", null, NOW, TTL_MS)).toThrow(
        "Refresh token hash must not be empty",
      );
    });

    it.each([0, -1, 1.5, Number.NaN])("should throw when the TTL is %s", (ttl) => {
      expect(() => RefreshToken.issue(session, "a".repeat(64), null, NOW, ttl)).toThrow(
        "Refresh token TTL must be a positive integer of milliseconds",
      );
    });
  });

  describe("isExpired", () => {
    const token = RefreshToken.issue(session, "a".repeat(64), null, NOW, TTL_MS);

    it("should not be expired when now is before the expiration", () => {
      expect(token.isExpired(at(TTL_MS - 1))).toBe(false);
    });

    it("should be expired when now equals the expiration", () => {
      expect(token.isExpired(at(TTL_MS))).toBe(true);
    });

    it("should be expired when now is after the expiration", () => {
      expect(token.isExpired(at(TTL_MS + 1))).toBe(true);
    });
  });

  describe("rotatedWithin", () => {
    const rotated = RefreshToken.rehydrate(record);
    const rotatedAt = record.rotatedAt!.getTime();

    it("should be within the grace window when rotated just now", () => {
      expect(rotated.rotatedWithin(GRACE_MS, new Date(rotatedAt))).toBe(true);
    });

    it("should be within the grace window when exactly at its edge", () => {
      expect(rotated.rotatedWithin(GRACE_MS, new Date(rotatedAt + GRACE_MS))).toBe(true);
    });

    it("should be outside the grace window when one millisecond past its edge", () => {
      expect(rotated.rotatedWithin(GRACE_MS, new Date(rotatedAt + GRACE_MS + 1))).toBe(false);
    });

    it("should be outside the grace window when the grace is zero and time has passed", () => {
      expect(rotated.rotatedWithin(0, new Date(rotatedAt + 1))).toBe(false);
    });

    it("should be false when the token is still active", () => {
      const active = RefreshToken.issue(session, "a".repeat(64), null, NOW, TTL_MS);
      expect(active.rotatedWithin(GRACE_MS, NOW)).toBe(false);
    });

    it("should be false when the token is revoked", () => {
      const revoked = RefreshToken.rehydrate({
        ...record,
        status: "REVOKED",
        rotatedAt: null,
        revokedAt: at(1_000),
      });
      expect(revoked.rotatedWithin(GRACE_MS, at(1_000))).toBe(false);
    });

    it("should be false when a rotated record has no rotation date", () => {
      const inconsistent = RefreshToken.rehydrate({ ...record, rotatedAt: null });
      expect(inconsistent.rotatedWithin(GRACE_MS, NOW)).toBe(false);
    });
  });

  describe("rehydrate", () => {
    it("should rebuild a token from a record without recomputing dates", () => {
      const token = RefreshToken.rehydrate(record);

      expect(token).toBeInstanceOf(RefreshToken);
      expect(token.id).toBe("token-2");
      expect(token.sessionId).toBe("session-1");
      expect(token.tokenHash).toBe("b".repeat(64));
      expect(token.parentTokenId).toBe("token-1");
      expect(token.status).toBe("ROTATED");
      expect(token.createdAt).toBe(NOW);
      expect(token.expiresAt).toEqual(at(TTL_MS));
      expect(token.rotatedAt).toEqual(at(1_000));
      expect(token.revokedAt).toBeNull();
    });

    it("should throw when the record has an unknown status", () => {
      expect(() => RefreshToken.rehydrate({ ...record, status: "EXPIRED" })).toThrow(
        'Invalid refresh token status: "EXPIRED"',
      );
    });
  });
});
