import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RevokeSessionUseCase } from "@src/domain/use-cases/auth/revoke-session.use-case";
import type { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";
import type { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import type { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("RevokeSessionUseCase", () => {
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
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Mocked<AuthEventLogger>;
  const useCase = new RevokeSessionUseCase(sessionRepository, refreshTokenGenerator, logger);

  const cookieSession = AuthSession.start("user-1", "password", BASE_DATE, 30 * DAY_MS);
  const bearerSession = AuthSession.start("user-1", "password", BASE_DATE, 30 * DAY_MS);
  const token = RefreshToken.issue(cookieSession, "hash-1", null, BASE_DATE, 7 * DAY_MS);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    refreshTokenGenerator.hash.mockReturnValue("hash-1");
    sessionRepository.findTokenByHash.mockResolvedValue({ token, session: cookieSession });
    sessionRepository.findSessionById.mockResolvedValue(bearerSession);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should revoke the session identified by the refresh cookie", async () => {
    await useCase.execute({ refreshToken: "plain-1", sessionId: bearerSession.id });

    expect(sessionRepository.findTokenByHash).toHaveBeenCalledWith("hash-1");
    expect(sessionRepository.findSessionById).not.toHaveBeenCalled();
    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      cookieSession.id,
      "LOGOUT",
      BASE_DATE,
    );
    expect(logger.info).toHaveBeenCalledWith("auth.session.revoked", {
      userId: "user-1",
      sessionId: cookieSession.id,
      reason: "LOGOUT",
    });
  });

  it("should revoke the access token's session when there is no cookie", async () => {
    await useCase.execute({ sessionId: bearerSession.id });

    expect(sessionRepository.findTokenByHash).not.toHaveBeenCalled();
    expect(sessionRepository.findSessionById).toHaveBeenCalledWith(bearerSession.id);
    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      bearerSession.id,
      "LOGOUT",
      BASE_DATE,
    );
  });

  it("should fall back to the access token's session when the cookie is unknown", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(null);

    await useCase.execute({ refreshToken: "plain-1", sessionId: bearerSession.id });

    expect(sessionRepository.revokeSession).toHaveBeenCalledWith(
      bearerSession.id,
      "LOGOUT",
      BASE_DATE,
    );
  });

  it("should do nothing when the cookie is unknown and there is no access token", async () => {
    sessionRepository.findTokenByHash.mockResolvedValue(null);

    await useCase.execute({ refreshToken: "plain-1" });

    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it("should do nothing when the session of the access token is unknown", async () => {
    sessionRepository.findSessionById.mockResolvedValue(null);

    await useCase.execute({ sessionId: "unknown" });

    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
  });

  it("should do nothing when neither the cookie nor the access token was sent", async () => {
    await useCase.execute({});

    expect(sessionRepository.findTokenByHash).not.toHaveBeenCalled();
    expect(sessionRepository.findSessionById).not.toHaveBeenCalled();
    expect(sessionRepository.revokeSession).not.toHaveBeenCalled();
  });
});
