import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthService } from "@src/application/services/auth.service";
import { User } from "@src/domain/entities/user.entity";
import { InvalidRefreshTokenError } from "@src/domain/errors/domain-error";
import type { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";
import type { LoginWithPasswordUseCase } from "@src/domain/use-cases/auth/login-with-password.use-case";
import type { RefreshSessionUseCase } from "@src/domain/use-cases/auth/refresh-session.use-case";
import type { RegisterWithPasswordUseCase } from "@src/domain/use-cases/auth/register-with-password.use-case";
import type { RevokeAllSessionsUseCase } from "@src/domain/use-cases/auth/revoke-all-sessions.use-case";
import type { RevokeSessionUseCase } from "@src/domain/use-cases/auth/revoke-session.use-case";
import type { StartSessionUseCase } from "@src/domain/use-cases/auth/start-session.use-case";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");
const REFRESH_EXPIRES_AT = new Date("2026-10-25T12:00:00.000Z");
const CREATED_AT = new Date("2026-01-01T00:00:00.000Z");

describe("AuthService", () => {
  const registerUseCase = { execute: vi.fn() };
  const loginWithPasswordUseCase = { execute: vi.fn() };
  const startSessionUseCase = { execute: vi.fn() };
  const refreshSessionUseCase = { execute: vi.fn() };
  const revokeSessionUseCase = { execute: vi.fn() };
  const revokeAllSessionsUseCase = { execute: vi.fn() };
  const getUserUseCase = { execute: vi.fn() };
  const service = new AuthService(
    registerUseCase as unknown as RegisterWithPasswordUseCase,
    loginWithPasswordUseCase as unknown as LoginWithPasswordUseCase,
    startSessionUseCase as unknown as StartSessionUseCase,
    refreshSessionUseCase as unknown as RefreshSessionUseCase,
    revokeSessionUseCase as unknown as RevokeSessionUseCase,
    revokeAllSessionsUseCase as unknown as RevokeAllSessionsUseCase,
    getUserUseCase as unknown as GetUserUseCase,
  );

  const user = User.create({ name: "Ana", email: "ana@exemplo.com", createdAt: CREATED_AT });
  const tokens = {
    sessionId: "session-1",
    userId: user.id,
    accessToken: "access-1",
    accessTokenExpiresAt: new Date(BASE_DATE.getTime() + 600_000),
    refreshToken: "plain-1",
    refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
  };
  const expected = {
    response: {
      accessToken: "access-1",
      tokenType: "Bearer",
      expiresIn: 600,
      user: {
        id: user.id,
        name: "Ana",
        email: "ana@exemplo.com",
        createdAt: CREATED_AT.toISOString(),
      },
    },
    refreshToken: "plain-1",
    refreshTokenExpiresAt: REFRESH_EXPIRES_AT,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    startSessionUseCase.execute.mockResolvedValue(tokens);
    refreshSessionUseCase.execute.mockResolvedValue(tokens);
    getUserUseCase.execute.mockResolvedValue(user);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should register the user and open a password session", async () => {
    registerUseCase.execute.mockResolvedValue(user);
    const input = { name: "Ana", email: "ana@exemplo.com", password: "correct horse battery" };

    const result = await service.register(input);

    expect(registerUseCase.execute).toHaveBeenCalledWith(input);
    expect(startSessionUseCase.execute).toHaveBeenCalledWith({
      userId: user.id,
      authMethod: "password",
    });
    expect(result).toEqual(expected);
  });

  it("should log in with password and open a password session", async () => {
    loginWithPasswordUseCase.execute.mockResolvedValue(user);
    const input = { email: "ana@exemplo.com", password: "correct horse battery" };

    const result = await service.loginWithPassword(input);

    expect(loginWithPasswordUseCase.execute).toHaveBeenCalledWith(input);
    expect(startSessionUseCase.execute).toHaveBeenCalledWith({
      userId: user.id,
      authMethod: "password",
    });
    expect(result).toEqual(expected);
  });

  it("should not open a session when the login fails", async () => {
    loginWithPasswordUseCase.execute.mockRejectedValue(new Error("boom"));

    await expect(
      service.loginWithPassword({ email: "ana@exemplo.com", password: "x" }),
    ).rejects.toThrow("boom");
    expect(startSessionUseCase.execute).not.toHaveBeenCalled();
  });

  it("should never put the refresh token in the response body", async () => {
    loginWithPasswordUseCase.execute.mockResolvedValue(user);

    const result = await service.loginWithPassword({ email: "ana@exemplo.com", password: "x" });

    expect(JSON.stringify(result.response)).not.toContain("plain-1");
  });

  it("should round the remaining access token lifetime up to whole seconds", async () => {
    vi.setSystemTime(new Date(BASE_DATE.getTime() + 500));
    loginWithPasswordUseCase.execute.mockResolvedValue(user);

    const result = await service.loginWithPassword({ email: "ana@exemplo.com", password: "x" });

    expect(result.response.expiresIn).toBe(600);
  });

  it("should refresh the session and load the user of the token", async () => {
    const result = await service.refresh("plain-0");

    expect(refreshSessionUseCase.execute).toHaveBeenCalledWith({ refreshToken: "plain-0" });
    expect(getUserUseCase.execute).toHaveBeenCalledWith(user.id);
    expect(result).toEqual(expected);
  });

  it("should propagate the refresh error without loading the user", async () => {
    refreshSessionUseCase.execute.mockRejectedValue(new InvalidRefreshTokenError());

    await expect(service.refresh(undefined)).rejects.toThrow(InvalidRefreshTokenError);
    expect(refreshSessionUseCase.execute).toHaveBeenCalledWith({ refreshToken: undefined });
    expect(getUserUseCase.execute).not.toHaveBeenCalled();
  });

  it("should revoke the current session on logout", async () => {
    await service.logout({ refreshToken: "plain-1", sessionId: "session-1" });

    expect(revokeSessionUseCase.execute).toHaveBeenCalledWith({
      refreshToken: "plain-1",
      sessionId: "session-1",
    });
  });

  it("should revoke every session of the user on logout-all", async () => {
    await service.logoutAll(user.id);

    expect(revokeAllSessionsUseCase.execute).toHaveBeenCalledWith({ userId: user.id });
  });
});
