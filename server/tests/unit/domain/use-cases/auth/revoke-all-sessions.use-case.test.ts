import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RevokeAllSessionsUseCase } from "@src/domain/use-cases/auth/revoke-all-sessions.use-case";
import type { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import type { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import type { Mocked } from "../../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-10-18T12:00:00.000Z");

describe("RevokeAllSessionsUseCase", () => {
  const sessionRepository = {
    revokeAllForUser: vi.fn(),
  } as unknown as Mocked<AuthSessionRepository>;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as Mocked<AuthEventLogger>;
  const useCase = new RevokeAllSessionsUseCase(sessionRepository, logger);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should revoke every session of the user with the LOGOUT_ALL reason", async () => {
    await useCase.execute({ userId: "user-1" });

    expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith(
      "user-1",
      "LOGOUT_ALL",
      BASE_DATE,
    );
    expect(logger.info).toHaveBeenCalledWith("auth.session.revoked", {
      userId: "user-1",
      reason: "LOGOUT_ALL",
    });
  });
});
