import { randomUUID } from "crypto";

export const AUTH_METHODS = ["password"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const AUTH_SESSION_STATUSES = ["ACTIVE", "REVOKED"] as const;
export type AuthSessionStatus = (typeof AUTH_SESSION_STATUSES)[number];

export const SESSION_REVOCATION_REASONS = [
  "LOGOUT",
  "LOGOUT_ALL",
  "REFRESH_TOKEN_REUSE",
  "ADMIN",
] as const;
export type SessionRevocationReason = (typeof SESSION_REVOCATION_REASONS)[number];

export interface AuthSessionPersistenceProps {
  id: string;
  userId: string;
  authMethod: AuthMethod;
  status: AuthSessionStatus;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revokedReason: SessionRevocationReason | null;
}

/**
 * Linha como o banco a devolve: estado, método e motivo são `String` no schema (sem enum) e só
 * viram os tipos fechados depois de validados por `rehydrate`.
 */
export interface AuthSessionRecord extends Omit<
  AuthSessionPersistenceProps,
  "authMethod" | "status" | "revokedReason"
> {
  authMethod: string;
  status: string;
  revokedReason: string | null;
}

/**
 * Uma sessão por login: a família de refresh tokens pendura nela. "Expirada" não é estado gravado —
 * é derivada de `expiresAt` (vida máxima absoluta, contada do login) comparado com agora.
 */
export class AuthSession {
  public readonly id: string;
  public readonly userId: string;
  public readonly authMethod: AuthMethod;
  public readonly status: AuthSessionStatus;
  public readonly createdAt: Date;
  public readonly lastUsedAt: Date;
  public readonly expiresAt: Date;
  public readonly revokedAt: Date | null;
  public readonly revokedReason: SessionRevocationReason | null;

  private constructor(props: AuthSessionPersistenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.authMethod = props.authMethod;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.lastUsedAt = props.lastUsedAt;
    this.expiresAt = props.expiresAt;
    this.revokedAt = props.revokedAt;
    this.revokedReason = props.revokedReason;
  }

  public static start(
    userId: string,
    authMethod: AuthMethod,
    now: Date,
    maxLifetimeMs: number,
  ): AuthSession {
    AuthSession.validateOneOf(authMethod, AUTH_METHODS, "auth method");
    AuthSession.validateLifetime(maxLifetimeMs);

    return new AuthSession({
      id: randomUUID(),
      userId,
      authMethod,
      status: "ACTIVE",
      createdAt: now,
      lastUsedAt: now,
      expiresAt: new Date(now.getTime() + maxLifetimeMs),
      revokedAt: null,
      revokedReason: null,
    });
  }

  /** Só para o repositório: `start` calcula as datas a partir de "agora" e não reconstrói uma linha. */
  public static rehydrate(record: AuthSessionRecord): AuthSession {
    return new AuthSession({
      ...record,
      authMethod: AuthSession.validateOneOf(record.authMethod, AUTH_METHODS, "auth method"),
      status: AuthSession.validateOneOf(record.status, AUTH_SESSION_STATUSES, "session status"),
      revokedReason:
        record.revokedReason === null
          ? null
          : AuthSession.validateOneOf(
              record.revokedReason,
              SESSION_REVOCATION_REASONS,
              "session revocation reason",
            ),
    });
  }

  /** Ativa enquanto não revogada e antes da vida máxima: em `now == expiresAt` já não vale. */
  public isActive(now: Date): boolean {
    return this.status === "ACTIVE" && now.getTime() < this.expiresAt.getTime();
  }

  /** Idempotente: uma sessão já revogada guarda a data e o motivo da primeira revogação. */
  public revoke(reason: SessionRevocationReason, now: Date): AuthSession {
    AuthSession.validateOneOf(reason, SESSION_REVOCATION_REASONS, "session revocation reason");
    const alreadyRevoked = this.status === "REVOKED";

    return new AuthSession({
      id: this.id,
      userId: this.userId,
      authMethod: this.authMethod,
      status: "REVOKED",
      createdAt: this.createdAt,
      lastUsedAt: this.lastUsedAt,
      expiresAt: this.expiresAt,
      revokedAt: alreadyRevoked ? this.revokedAt : now,
      revokedReason: alreadyRevoked ? this.revokedReason : reason,
    });
  }

  private static validateLifetime(maxLifetimeMs: number): void {
    if (!Number.isInteger(maxLifetimeMs) || maxLifetimeMs <= 0) {
      throw new Error("Session max lifetime must be a positive integer of milliseconds");
    }
  }

  private static validateOneOf<T extends string>(
    value: string,
    allowed: readonly T[],
    label: string,
  ): T {
    if (!(allowed as readonly string[]).includes(value)) {
      throw new Error(`Invalid ${label}: "${value}"`);
    }
    return value as T;
  }
}
