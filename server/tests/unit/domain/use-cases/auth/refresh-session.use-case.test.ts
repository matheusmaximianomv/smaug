import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RefreshSessionUseCase } from "@src/domain/use-cases/auth/refresh-session.use-case";
import type { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";
import {
  InvalidRefreshTokenError,
  RefreshTokenConflictError,
} from "@src/domain/errors/domain-error";
import type { AccessTokenService } from "@src/domain/ports/access-token-service";
import type { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import type { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const GRACE_MS = 30_000;
const POLICY = { refreshTokenTtlMs: 7 * DAY_MS, reuseGraceMs: GRACE_MS };
const USER_ID = "user-1";
const SESSION_ID = "session-1";
const TOKEN_ID = "token-1";
const ACCESS_EXPIRES_AT = new Date(BASE_DATE.getTime() + 600_000);

const at = (offsetMs: number): Date => new Date(BASE_DATE.getTime() + offsetMs);

const buildSession = (overrides: { status?: string; expiresAt?: Date } = {}): AuthSession =>
  AuthSession.rehydrate({
    id: SESSION_ID,
    userId: USER_ID,
    authMethod: "password",
    status: overrides.status ?? "ACTIVE",
    createdAt: at(-DAY_MS),
    lastUsedAt: at(-DAY_MS),
    expiresAt: overrides.expiresAt ?? at(29 * DAY_MS),
    revokedAt: overrides.status === "REVOKED" ? at(-1000) : null,
    revokedReason: overrides.status === "REVOKED" ? "LOGOUT" : null,
  });

const buildToken = (
  overrides: { status?: string; expiresAt?: Date; rotatedAt?: Date | null } = {},
): RefreshToken =>
  RefreshToken.rehydrate({
    id: TOKEN_ID,
    sessionId: SESSION_ID,
    tokenHash: "hash-1",
    parentTokenId: null,
    status: overrides.status ?? "ACTIVE",
    createdAt: at(-DAY_MS),
    expiresAt: overrides.expiresAt ?? at(6 * DAY_MS),
    rotatedAt: overrides.rotatedAt ?? null,
    revokedAt: null,
  });

const rotatedAgo = (ms: number): RefreshToken =>
  buildToken({ status: "ROTATED", rotatedAt: at(-ms) });

describe("RefreshSessionUseCase", () => {
  const sessionRepository = {
    create: vi.fn(),
    findSessionById: vi.fn(),
    findTokenByHash: vi.fn(),
    rotate: vi.fn(),
    revokeSession: vi.fn(),
    revokeAllForUser: vi.fn(),
    deleteStaleForUser: vi.fn(),
  } as unknown as Mocked<AuthSessionRepository>;
  const refreshTokenGenerator = {
    generate: vi.fn(),
    hash: vi.fn(),
  } as unknown as Mocked<RefreshTokenGenerator>;
  const accessTokenService = {
    issue: vi.fn(),
    verify: vi.fn(),
  } as unknown as Mocked<AccessTokenService>;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Mocked<AuthEventLogger>;
  const useCase = new RefreshSessionUseCase(
    sessionRepository,
    refreshTokenGenerator,
    accessTokenService,
    logger,
    POLICY,
  );
  const input = { refreshToken: "plain-1" };

  const found = (token: RefreshToken, session: AuthSession = buildSession()) => ({
    token,
    session,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    refreshTokenGenerator.hash.mockReturnValue("hash-1");
    refreshTokenGenerator.generate.mockReturnValue({ plain: "plain-2", hash: "hash-2" });
    sessionRepository.findTokenByHash.mockResolvedValue(found(buildToken()));
    sessionRepository.rotate.mockResolvedValue(true);
    accessTokenService.issue.mockResolvedValue({ token: "access-2", expiresAt: ACCESS_EXPIRES_AT });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should rotate the active token and return a new pair", async () => {
    const result = await useCase.execute(input);

    expect(sessionRepository.findTokenByHash).toHaveBeenCalledWith("hash-1");
    const [currentId, next, now] = sessionRepository.rotate.mock.calls[0];
    expect(currentId).toBe(TOKEN_ID);
    expect(next.parentTokenId).toBe(TOKEN_ID);
    expect(next.sessionId).toBe(SESSION_ID);
    expect(next.tokenHash).toBe("hash-2");
    expect(next.expiresAt.toISOString()).toBe(at(7 * DAY_MS).toISOString());
    expect(now.toISOString()).toBe(BASE_DATE.toISOString());
    expect(accessTokenService.issue).toHaveBeenCalledWith({
      userId: USER_ID,
      sessionId: SESSION_ID,
    });
    expect(result).toEqual({
      sessionId: SESSION_ID,
      userId: USER_ID,
      accessToken: "access-2",
      accessTokenExpiresAt: ACCESS_EXPIRES_AT,
      refreshToken: "plain-2",
      refreshTokenExpiresAt: at(7 * DAY_MS),
    });
  });

  it("should cap the new token at the session's max lifetime", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(
      found(buildToken({ expiresAt: at(DAY_MS) }), buildSession({ expiresAt: at(DAY_MS) })),
    );

    const result = await useCase.execute(input);

    expect(result.refreshTokenExpiresAt.toISOString()).toBe(at(DAY_MS).toISOString());
  });

  it.each([
    ["missing", {}],
    ["empty", { refreshToken: "" }],
  ])("should throw InvalidRefreshTokenError when the token is %s", async (_label, missing) => {
    await expect(useCase.execute(missing)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.findTokenByHash).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the token is unknown", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the session is revoked", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(
      found(buildToken(), buildSession({ status: "REVOKED" })),
    );

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the session reached its max lifetime", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(
      found(buildToken({ expiresAt: BASE_DATE }), buildSession({ expiresAt: BASE_DATE })),
    );

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the token expired", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(
      found(buildToken({ expiresAt: BASE_DATE })),
    );

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the token was revoked", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(found(buildToken({ status: "REVOKED" })));

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(sessionRepository.rotate).not.toHaveBeenCalled();
    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
  });

  it.each([
    ["just now", 0],
    ["exactly at the grace window", GRACE_MS],
  ])(
    "should throw RefreshTokenConflictError without revoking when the token was rotated %s",
    async (_label, ago) => {
      sessionRepository.findTokenByHash.mockResolvedValue(found(rotatedAgo(ago)));

      await expect(useCase.execute(input)).rejects.toThrow(RefreshTokenConflictError);
      expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
      expect(sessionRepository.rotate).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith("auth.refresh.conflict", {
        userId: USER_ID,
        sessionId: SESSION_ID,
      });
    },
  );

  it.each([
    ["one millisecond after the grace window", GRACE_MS + 1],
    ["five minutes ago", 5 * 60_000],
  ])(
    "should revoke the session and log a warning when a token rotated %s is reused",
    async (_label, ago) => {
      sessionRepository.findTokenByHash.mockResolvedValue(found(rotatedAgo(ago)));

      await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
      expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
        SESSION_ID,
        "REFRESH_TOKEN_REUSE",
        BASE_DATE,
      );
      expect(sessionRepository.revokeAllForUser).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("auth.refresh.reuse_detected", {
        userId: USER_ID,
        sessionId: SESSION_ID,
      });
    },
  );

  it("should throw RefreshTokenConflictError when the CAS is lost to a concurrent rotation", async () => {
    sessionRepository.rotate.mockResolvedValue(false);
    sessionRepository.findTokenByHash
      .mockResolvedValueOnce(found(buildToken()))
      .mockResolvedValueOnce(found(rotatedAgo(0)));

    await expect(useCase.execute(input)).rejects.toThrow(RefreshTokenConflictError);
    expect(sessionRepository.findTokenByHash).toHaveBeenCalledTimes(2);
    expect(sessionRepository.findTokenByHash).toHaveBeenLastCalledWith("hash-1");
    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    expect(accessTokenService.issue).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith("auth.refresh.conflict", expect.any(Object));
  });

  it("should throw InvalidRefreshTokenError when the CAS is lost to a logout", async () => {
    sessionRepository.rotate.mockResolvedValue(false);
    sessionRepository.findTokenByHash
      .mockResolvedValueOnce(found(buildToken()))
      .mockResolvedValueOnce(
        found(buildToken({ status: "REVOKED" }), buildSession({ status: "REVOKED" })),
      );

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(accessTokenService.issue).not.toHaveBeenCalled();
  });

  it("should throw InvalidRefreshTokenError when the token vanished before the re-read", async () => {
    sessionRepository.rotate.mockResolvedValue(false);
    sessionRepository.findTokenByHash
      .mockResolvedValueOnce(found(buildToken()))
      .mockResolvedValueOnce(null);

    await expect(useCase.execute(input)).rejects.toThrow(InvalidRefreshTokenError);
    expect(accessTokenService.issue).not.toHaveBeenCalled();
  });
});
