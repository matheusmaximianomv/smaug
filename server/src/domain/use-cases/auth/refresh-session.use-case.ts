import { RefreshToken } from "@src/domain/entities/refresh-token.entity";
import {
  InvalidRefreshTokenError,
  RefreshTokenConflictError,
} from "@src/domain/errors/domain-error";
import { AccessTokenService } from "@src/domain/ports/access-token-service";
import {
  AuthSessionRepository,
  RefreshTokenWithSession,
} from "@src/domain/ports/auth-session.repository";
import { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";
import { AuthEventLogger } from "@src/domain/ports/auth-event-logger";
import { SessionPolicy, SessionTokens } from "@src/domain/use-cases/auth/start-session.use-case";

export interface RefreshSessionInput {
  /** Valor em claro do cookie; ausente quando o cookie não veio. */
  refreshToken?: string;
}

/**
 * Troca o refresh token por um par novo (§8.2 da especificação técnica). A atomicidade é do
 * `rotate` do repositório (compare-and-set); aqui fica a decisão entre renovar, responder
 * conflito (corrida entre abas, dentro da janela de tolerância) ou tratar como reuso e revogar a
 * família inteira.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly accessTokenService: AccessTokenService,
    private readonly logger: AuthEventLogger,
    private readonly policy: Pick<SessionPolicy, "refreshTokenTtlMs" | "reuseGraceMs">,
  ) {}

  public async execute(input: RefreshSessionInput): Promise<SessionTokens> {
    const now = new Date();
    if (!input.refreshToken) {
      throw new InvalidRefreshTokenError();
    }

    const tokenHash = this.refreshTokenGenerator.hash(input.refreshToken);
    const found = await this.sessionRepository.findTokenByHash(tokenHash);
    if (!found || !found.session.isActive(now)) {
      throw new InvalidRefreshTokenError();
    }

    const { token, session } = found;
    if (token.status === "REVOKED") {
      throw new InvalidRefreshTokenError();
    }
    if (token.status === "ROTATED") {
      return this.rejectRotated(found, now);
    }
    if (token.isExpired(now)) {
      throw new InvalidRefreshTokenError();
    }

    const generated = this.refreshTokenGenerator.generate();
    const next = RefreshToken.issue(
      session,
      generated.hash,
      token.id,
      now,
      this.policy.refreshTokenTtlMs,
    );
    const rotated = await this.sessionRepository.rotate(token.id, next, now);
    if (!rotated) {
      // Outra requisição venceu entre a leitura e o CAS: relê para saber se foi a aba vizinha.
      const reread = await this.sessionRepository.findTokenByHash(tokenHash);
      if (reread?.token.rotatedWithin(this.policy.reuseGraceMs, now)) {
        this.logConflict(reread);
        throw new RefreshTokenConflictError();
      }
      throw new InvalidRefreshTokenError();
    }

    const accessToken = await this.accessTokenService.issue({
      userId: session.userId,
      sessionId: session.id,
    });
    return {
      sessionId: session.id,
      userId: session.userId,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: generated.plain,
      refreshTokenExpiresAt: next.expiresAt,
    };
  }

  private async rejectRotated(found: RefreshTokenWithSession, now: Date): Promise<never> {
    if (found.token.rotatedWithin(this.policy.reuseGraceMs, now)) {
      this.logConflict(found);
      throw new RefreshTokenConflictError();
    }

    await this.sessionRepository.revokeSession(found.session.id, "REFRESH_TOKEN_REUSE", now);
    this.logger.warn("auth.refresh.reuse_detected", {
      userId: found.session.userId,
      sessionId: found.session.id,
    });
    throw new InvalidRefreshTokenError();
  }

  private logConflict(found: RefreshTokenWithSession): void {
    this.logger.info("auth.refresh.conflict", {
      userId: found.session.userId,
      sessionId: found.session.id,
    });
  }
}
