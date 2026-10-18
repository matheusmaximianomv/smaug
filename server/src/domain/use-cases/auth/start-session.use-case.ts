import { AuthMethod, AuthSession } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";
import { AccessTokenService } from "@src/domain/ports/access-token-service";
import { AuthSessionRepository } from "@src/domain/ports/auth-session.repository";
import { RefreshTokenGenerator } from "@src/domain/ports/refresh-token-generator";

/** Durações da sessão em milissegundos; o container as converte do `AuthConfig` (em segundos). */
export interface SessionPolicy {
  refreshTokenTtlMs: number;
  maxLifetimeMs: number;
  reuseGraceMs: number;
}

/** Par de tokens de uma sessão aberta ou renovada. `refreshToken` é o valor em claro (do cookie). */
export interface SessionTokens {
  sessionId: string;
  userId: string;
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface StartSessionInput {
  userId: string;
  authMethod: AuthMethod;
}

/** Sessões expiradas ou revogadas há mais que isto saem na faxina do login (§9.3). */
const STALE_SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Abre a sessão de um usuário que já provou quem é, qualquer que tenha sido o método: é o encaixe
 * comum a senha hoje e a provedores externos amanhã.
 */
export class StartSessionUseCase {
  constructor(
    private readonly sessionRepository: AuthSessionRepository,
    private readonly refreshTokenGenerator: RefreshTokenGenerator,
    private readonly accessTokenService: AccessTokenService,
    private readonly policy: SessionPolicy,
  ) {}

  public async execute(input: StartSessionInput): Promise<SessionTokens> {
    const now = new Date();
    const session = AuthSession.start(
      input.userId,
      input.authMethod,
      now,
      this.policy.maxLifetimeMs,
    );
    const generated = this.refreshTokenGenerator.generate();
    const refreshToken = RefreshToken.issue(
      session,
      generated.hash,
      null,
      now,
      this.policy.refreshTokenTtlMs,
    );

    await this.sessionRepository.create(session, refreshToken);
    const accessToken = await this.accessTokenService.issue({
      userId: session.userId,
      sessionId: session.id,
    });
    await this.sessionRepository.deleteStaleForUser(
      session.userId,
      new Date(now.getTime() - STALE_SESSION_RETENTION_MS),
    );

    return {
      sessionId: session.id,
      userId: session.userId,
      accessToken: accessToken.token,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: generated.plain,
      refreshTokenExpiresAt: refreshToken.expiresAt,
    };
  }
}
