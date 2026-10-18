import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthenticateRequestUseCase } from "@src/domain/use-cases/auth/authenticate-request.use-case";
import { AuthSession } from "@src/domain/entities/auth-session.entity";
import type { AccessTokenService } from "@src/domain/ports/access-token-service";
import type { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("AuthenticateRequestUseCase", () => {
  const accessTokenService = {
    issue: vi.fn(),
    verify: vi.fn(),
  } as unknown as Mocked<AccessTokenService>;
  const sessionRepository = {
    findSessionById: vi.fn(),
  } as unknown as Mocked<AuthSessionRepository>;
  const useCase = new AuthenticateRequestUseCase(accessTokenService, sessionRepository);

  const session = AuthSession.start("user-1", "password", BASE_DATE, 30 * DAY_MS);
  const claims = { userId: "user-1", sessionId: session.id };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    accessTokenService.verify.mockResolvedValue(claims);
    sessionRepository.findSessionById.mockResolvedValue(session);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the claims when the token is valid and the session is active", async () => {
    const result = await useCase.execute({ accessToken: "access-1" });

    expect(result).toEqual(claims);
    expect(accessTokenService.verify).toHaveBeenCalledWith("access-1");
    expect(sessionRepository.findSessionById).toHaveBeenCalledWith(session.id);
  });

  it("should return null without reading the session when the token is invalid", async () => {
    accessTokenService.verify.mockResolvedValue(null);

    const result = await useCase.execute({ accessToken: "forged" });

    expect(result).toBeNull();
    expect(sessionRepository.findSessionById).not.toHaveBeenCalled();
  });

  it("should return null when the session does not exist", async () => {
    sessionRepository.findSessionById.mockResolvedValue(null);

    const result = await useCase.execute({ accessToken: "access-1" });

    expect(result).toBeNull();
  });

  it("should return null when the session belongs to another user", async () => {
    accessTokenService.verify.mockResolvedValue({ ...claims, userId: "user-2" });

    const result = await useCase.execute({ accessToken: "access-1" });

    expect(result).toBeNull();
  });

  it("should return null when the session was revoked", async () => {
    sessionRepository.findSessionById.mockResolvedValue(session.revoke("LOGOUT", BASE_DATE));

    const result = await useCase.execute({ accessToken: "access-1" });

    expect(result).toBeNull();
  });

  it("should return null when the session reached its max lifetime", async () => {
    vi.setSystemTime(session.expiresAt);

    const result = await useCase.execute({ accessToken: "access-1" });

    expect(result).toBeNull();
  });
});
