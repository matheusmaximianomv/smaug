export interface GeneratedRefreshToken {
  /** Vai para o cookie, nunca para o banco nem para log. */
  plain: string;
  /** Vai para o banco. */
  hash: string;
}

export interface RefreshTokenGenerator {
  generate(): GeneratedRefreshToken;
  hash(plain: string): string;
}
