import { describe, it, expect } from "vitest";
import { AuthSession, type AuthSessionRecord } from "@src/domain/entities/auth-session.entity";

const NOW = new Date("2026-05-01T10:00:00.000Z");
const MAX_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function at(offsetMs: number): Date {
  return new Date(NOW.getTime() + offsetMs);
}

const record: AuthSessionRecord = {
  id: "session-1",
  userId: "user-1",
  authMethod: "password",
  status: "ACTIVE",
  createdAt: NOW,
  lastUsedAt: at(1_000),
  expiresAt: at(MAX_LIFETIME_MS),
  revokedAt: null,
  revokedReason: null,
};

describe("AuthSession", () => {
  describe("start", () => {
    it("should open an active session expiring after the max lifetime when started", () => {
      const session = AuthSession.start("user-1", "password", NOW, MAX_LIFETIME_MS);

      expect(session.id).toMatch(UUID);
      expect(session.userId).toBe("user-1");
      expect(session.authMethod).toBe("password");
      expect(session.status).toBe("ACTIVE");
      expect(session.createdAt).toBe(NOW);
      expect(session.lastUsedAt).toBe(NOW);
      expect(session.expiresAt).toEqual(at(MAX_LIFETIME_MS));
      expect(session.revokedAt).toBeNull();
      expect(session.revokedReason).toBeNull();
    });

    it("should generate a distinct id for each session", () => {
      const a = AuthSession.start("user-1", "password", NOW, MAX_LIFETIME_MS);
      const b = AuthSession.start("user-1", "password", NOW, MAX_LIFETIME_MS);
      expect(a.id).not.toBe(b.id);
    });

    it("should throw when the auth method is unknown", () => {
      expect(() =>
        AuthSession.start("user-1", "google" as "password", NOW, MAX_LIFETIME_MS),
      ).toThrow('Invalid auth method: "google"');
    });

    it.each([0, -1, 1.5, Number.NaN])("should throw when the max lifetime is %s", (lifetime) => {
      expect(() => AuthSession.start("user-1", "password", NOW, lifetime)).toThrow(
        "Session max lifetime must be a positive integer of milliseconds",
      );
    });
  });

  describe("isActive", () => {
    const session = AuthSession.start("user-1", "password", NOW, MAX_LIFETIME_MS);

    it("should be active when now is before the expiration", () => {
      expect(session.isActive(at(MAX_LIFETIME_MS - 1))).toBe(true);
    });

    it("should not be active when now equals the expiration", () => {
      expect(session.isActive(at(MAX_LIFETIME_MS))).toBe(false);
    });

    it("should not be active when now is after the expiration", () => {
      expect(session.isActive(at(MAX_LIFETIME_MS + 1))).toBe(false);
    });

    it("should not be active when the session is revoked, even before the expiration", () => {
      expect(session.revoke("LOGOUT", NOW).isActive(NOW)).toBe(false);
    });
  });

  describe("revoke", () => {
    const session = AuthSession.start("user-1", "password", NOW, MAX_LIFETIME_MS);

    it("should return a revoked copy with the reason and date when revoking an active session", () => {
      const revoked = session.revoke("REFRESH_TOKEN_REUSE", at(5_000));

      expect(revoked).not.toBe(session);
      expect(revoked.status).toBe("REVOKED");
      expect(revoked.revokedAt).toEqual(at(5_000));
      expect(revoked.revokedReason).toBe("REFRESH_TOKEN_REUSE");
      expect(revoked.id).toBe(session.id);
      expect(revoked.userId).toBe(session.userId);
      expect(revoked.authMethod).toBe(session.authMethod);
      expect(revoked.createdAt).toBe(session.createdAt);
      expect(revoked.lastUsedAt).toBe(session.lastUsedAt);
      expect(revoked.expiresAt).toBe(session.expiresAt);
    });

    it("should leave the original session untouched when revoking", () => {
      session.revoke("LOGOUT", NOW);

      expect(session.status).toBe("ACTIVE");
      expect(session.revokedAt).toBeNull();
      expect(session.revokedReason).toBeNull();
    });

    it("should keep the first revocation date and reason when revoking twice", () => {
      const first = session.revoke("LOGOUT", at(1_000));
      const second = first.revoke("LOGOUT_ALL", at(2_000));

      expect(second).not.toBe(first);
      expect(second.status).toBe("REVOKED");
      expect(second.revokedAt).toEqual(at(1_000));
      expect(second.revokedReason).toBe("LOGOUT");
    });

    it("should throw when the reason is unknown", () => {
      expect(() => session.revoke("EXPIRED" as "LOGOUT", NOW)).toThrow(
        'Invalid session revocation reason: "EXPIRED"',
      );
    });
  });

  describe("rehydrate", () => {
    it("should rebuild an active session from a record", () => {
      const session = AuthSession.rehydrate(record);

      expect(session).toBeInstanceOf(AuthSession);
      expect(session.id).toBe("session-1");
      expect(session.userId).toBe("user-1");
      expect(session.authMethod).toBe("password");
      expect(session.status).toBe("ACTIVE");
      expect(session.createdAt).toBe(NOW);
      expect(session.lastUsedAt).toEqual(at(1_000));
      expect(session.expiresAt).toEqual(at(MAX_LIFETIME_MS));
      expect(session.revokedAt).toBeNull();
      expect(session.revokedReason).toBeNull();
    });

    it("should rebuild a revoked session with its reason from a record", () => {
      const session = AuthSession.rehydrate({
        ...record,
        status: "REVOKED",
        revokedAt: at(2_000),
        revokedReason: "ADMIN",
      });

      expect(session.status).toBe("REVOKED");
      expect(session.revokedAt).toEqual(at(2_000));
      expect(session.revokedReason).toBe("ADMIN");
    });

    it("should not recompute dates from now when rehydrating an already expired session", () => {
      const session = AuthSession.rehydrate({ ...record, expiresAt: at(-1) });
      expect(session.expiresAt).toEqual(at(-1));
      expect(session.isActive(NOW)).toBe(false);
    });

    it("should throw when the record has an unknown status", () => {
      expect(() => AuthSession.rehydrate({ ...record, status: "EXPIRED" })).toThrow(
        'Invalid session status: "EXPIRED"',
      );
    });

    it("should throw when the record has an unknown auth method", () => {
      expect(() => AuthSession.rehydrate({ ...record, authMethod: "google" })).toThrow(
        'Invalid auth method: "google"',
      );
    });

    it("should throw when the record has an unknown revocation reason", () => {
      expect(() =>
        AuthSession.rehydrate({ ...record, status: "REVOKED", revokedReason: "TIMEOUT" }),
      ).toThrow('Invalid session revocation reason: "TIMEOUT"');
    });
  });
});
