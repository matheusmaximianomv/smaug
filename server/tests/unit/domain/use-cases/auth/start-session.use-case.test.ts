import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StartSessionUseCase } from "@src/domain/use-cases/auth/start-session.use-case";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";
import type { AccessTokenService } from "@src/domain/ports/access-token-service";
import type { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import type { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const USER_ID = "user-1";
const DAY_MS = 24 * 60 * 60 * 1000;
const POLICY = { refreshTokenTtlMs: 7 * DAY_MS, maxLifetimeMs: 30 * DAY_MS, reuseGraceMs: 30_000 };
const ACCESS_EXPIRES_AT = new Date(BASE_DATE.getTime() + 600_000);

describe("StartSessionUseCase", () => {
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
  const useCase = new StartSessionUseCase(
    sessionRepository,
    refreshTokenGenerator,
    accessTokenService,
    POLICY,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    refreshTokenGenerator.generate.mockReturnValue({ plain: "plain-1", hash: "hash-1" });
    accessTokenService.issue.mockResolvedValue({ token: "access-1", expiresAt: ACCESS_EXPIRES_AT });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should persist a new session with its first refresh token", async () => {
    await useCase.execute({ userId: USER_ID, authMethod: "password" });

    const [session, token] = sessionRepository.create.mock.calls[0];
    expect(session).toBeInstanceOf(AuthSession);
    expect(session.userId).toBe(USER_ID);
    expect(session.authMethod).toBe("password");
    expect(session.status).toBe("ACTIVE");
    expect(session.expiresAt.toISOString()).toBe(
      new Date(BASE_DATE.getTime() + 30 * DAY_MS).toISOString(),
    );
    expect(token).toBeInstanceOf(RefreshToken);
    expect(token.sessionId).toBe(session.id);
    expect(token.tokenHash).toBe("hash-1");
    expect(token.parentTokenId).toBeNull();
    expect(token.expiresAt.toISOString()).toBe(
      new Date(BASE_DATE.getTime() + 7 * DAY_MS).toISOString(),
    );
  });

  it("should return the access token and the plain refresh token", async () => {
    const result = await useCase.execute({ userId: USER_ID, authMethod: "password" });

    const [session] = sessionRepository.create.mock.calls[0];
    expect(accessTokenService.issue).toHaveBeenCalledWith({
      userId: USER_ID,
      sessionId: session.id,
    });
    expect(result).toEqual({
      sessionId: session.id,
      userId: USER_ID,
      accessToken: "access-1",
      accessTokenExpiresAt: ACCESS_EXPIRES_AT,
      refreshToken: "plain-1",
      refreshTokenExpiresAt: new Date(BASE_DATE.getTime() + 7 * DAY_MS),
    });
  });

  it("should clean up the user's sessions that ended more than seven days ago", async () => {
    await useCase.execute({ userId: USER_ID, authMethod: "password" });

    expect(sessionRepository.deleteStaleForUser).toHaveBeenCalledWith(
      USER_ID,
      new Date(BASE_DATE.getTime() - 7 * DAY_MS),
    );
  });

  it("should not issue an access token when persisting the session fails", async () => {
    sessionRepository.create.mockRejectedValue(new Error("database is locked"));

    await expect(useCase.execute({ userId: USER_ID, authMethod: "password" })).rejects.toThrow(
      "database is locked",
    );
    expect(accessTokenService.issue).not.toHaveBeenCalled();
  });
});
