export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
}

export interface IssuedAccessToken {
  token: string;
  expiresAt: Date;
}

export interface AccessTokenService {
  issue(claims: AccessTokenClaims): Promise<IssuedAccessToken>;
  /** null para qualquer falha (assinatura, algoritmo, expiração, claim) — o motivo não sai daqui. */
  verify(token: string): Promise<AccessTokenClaims | null>;
}
