import { randomUUID } from "crypto";
import type { AuthSession } from "@src/domain/entities/auth-session.entity";

export const REFRESH_TOKEN_STATUSES = ["ACTIVE", "ROTATED", "REVOKED"] as const;
export type RefreshTokenStatus = (typeof REFRESH_TOKEN_STATUSES)[number];

export interface RefreshTokenPersistenceProps {
  id: string;
  sessionId: string;
  tokenHash: string;
  parentTokenId: string | null;
  status: RefreshTokenStatus;
  createdAt: Date;
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
}

/** Linha como o banco a devolve: `status` é `String` no schema e só vira o tipo fechado em `rehydrate`. */
export interface RefreshTokenRecord extends Omit<RefreshTokenPersistenceProps, "status"> {
  status: string;
}

/**
 * Um elo da cadeia de refresh tokens de uma sessão (`parentTokenId` aponta o antecessor). Só o hash
 * mora aqui; o valor em claro nunca entra na entidade. "Expirado" é derivado de `expiresAt`.
 */
export class RefreshToken {
  public readonly id: string;
  public readonly sessionId: string;
  public readonly tokenHash: string;
  public readonly parentTokenId: string | null;
  public readonly status: RefreshTokenStatus;
  public readonly createdAt: Date;
  public readonly expiresAt: Date;
  public readonly rotatedAt: Date | null;
  public readonly revokedAt: Date | null;

  private constructor(props: RefreshTokenPersistenceProps) {
    this.id = props.id;
    this.sessionId = props.sessionId;
    this.tokenHash = props.tokenHash;
    this.parentTokenId = props.parentTokenId;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.expiresAt = props.expiresAt;
    this.rotatedAt = props.rotatedAt;
    this.revokedAt = props.revokedAt;
  }

  /** Expira em `ttlMs` a partir de agora, mas nunca depois da vida máxima da sessão. */
  public static issue(
    session: AuthSession,
    tokenHash: string,
    parentTokenId: string | null,
    now: Date,
    ttlMs: number,
  ): RefreshToken {
    RefreshToken.validateTokenHash(tokenHash);
    RefreshToken.validateTtl(ttlMs);

    const expiresAt = Math.min(now.getTime() + ttlMs, session.expiresAt.getTime());
    return new RefreshToken({
      id: randomUUID(),
      sessionId: session.id,
      tokenHash,
      parentTokenId,
      status: "ACTIVE",
      createdAt: now,
      expiresAt: new Date(expiresAt),
      rotatedAt: null,
      revokedAt: null,
    });
  }

  /** Só para o repositório: `issue` calcula as datas a partir de "agora" e não reconstrói uma linha. */
  public static rehydrate(record: RefreshTokenRecord): RefreshToken {
    return new RefreshToken({ ...record, status: RefreshToken.validateStatus(record.status) });
  }

  /** Em `now == expiresAt` o token já expirou (o mesmo `expires_at > now` do CAS de `rotate`). */
  public isExpired(now: Date): boolean {
    return now.getTime() >= this.expiresAt.getTime();
  }

  /** Trocado há no máximo `graceMs` (borda inclusiva): reapresentá-lo é corrida entre abas, não reuso. */
  public rotatedWithin(graceMs: number, now: Date): boolean {
    if (this.status !== "ROTATED" || this.rotatedAt === null) {
      return false;
    }
    return now.getTime() - this.rotatedAt.getTime() <= graceMs;
  }

  private static validateTokenHash(tokenHash: string): void {
    if (tokenHash.length === 0) {
      throw new Error("Refresh token hash must not be empty");
    }
  }

  private static validateTtl(ttlMs: number): void {
    if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
      throw new Error("Refresh token TTL must be a positive integer of milliseconds");
    }
  }

  private static validateStatus(status: string): RefreshTokenStatus {
    if (!(REFRESH_TOKEN_STATUSES as readonly string[]).includes(status)) {
      throw new Error(`Invalid refresh token status: "${status}"`);
    }
    return status as RefreshTokenStatus;
  }
}
