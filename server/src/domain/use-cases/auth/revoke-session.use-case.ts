import { AuthSession } from "@src/domain/entities/auth-session.entity";
import { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";
import { AuthEventLogger } from "@src/domain/ports/auth-event-logger";

export interface RevokeSessionInput {
  /** Valor em claro do cookie de refresh. Tem precedência sobre `sessionId`. */
  refreshToken?: string;
  /** `sid` de um access token já verificado, para quando o cookie não identifica a sessão. */
  sessionId?: string;
}

/** Logout: revoga a sessão corrente. Idempotente e silencioso quando não acha a sessão. */
export class RevokeSessionUseCase {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly logger: AuthEventLogger,
  ) {}

  public async execute(input: RevokeSessionInput): Promise<void> {
    const session = await this.resolveSession(input);
    if (!session) {
      return;
    }

    await this.sessionRepository.revokeSession(session.id, "LOGOUT", new Date());
    this.logger.info("auth.session.revoked", {
      userId: session.userId,
      sessionId: session.id,
      reason: "LOGOUT",
    });
  }

  private async resolveSession(input: RevokeSessionInput): Promise<AuthSession | null> {
    if (input.refreshToken) {
      const found = await this.sessionRepository.findTokenByHash(
        this.refreshTokenGenerator.hash(input.refreshToken),
      );
      if (found) {
        return found.session;
      }
    }
    if (input.sessionId) {
      return this.sessionRepository.findSessionById(input.sessionId);
    }
    return null;
  }
}
