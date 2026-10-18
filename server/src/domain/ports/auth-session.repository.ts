import { AuthSession, SessionRevocationReason } from "@src/domain/entities/auth-session.entity";
import { RefreshToken } from "@src/domain/entities/refresh-token.entity";

export interface RefreshTokenWithSession {
  token: RefreshToken;
  session: AuthSession;
}

export interface AuthSessionRepository {
  /** Sessão nova e o primeiro refresh token dela, na mesma transação. */
  create(session: AuthSession, firstToken: RefreshToken): Promise<void>;
  findSessionById(id: string): Promise<AuthSession | null>;
  findTokenByHash(tokenHash: string): Promise<RefreshTokenWithSession | null>;
  /**
   * Troca atômica: marca `currentTokenId` como ROTATED **somente se** ainda estiver ACTIVE e a
   * sessão ainda estiver ACTIVE, e grava `next`. false = outra requisição chegou antes.
   */
  rotate(currentTokenId: string, next: RefreshToken, now: Date): Promise<boolean>;
  /** Revoga a sessão e todos os tokens ACTIVE dela. Idempotente. */
  revokeSession(sessionId: string, reason: SessionRevocationReason, now: Date): Promise<void>;
  revokeAllForUser(userId: string, reason: SessionRevocationReason, now: Date): Promise<void>;
  /** Faxina oportunista: sessões do usuário expiradas ou revogadas há mais de `olderThan`. */
  deleteStaleForUser(userId: string, olderThan: Date): Promise<void>;
}
