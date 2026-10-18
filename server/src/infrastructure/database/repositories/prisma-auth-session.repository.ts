import { Prisma, PrismaClient } from "@prisma/client";
import {
  AuthSession,
  type AuthSessionRecord,
  type SessionRevocationReason,
} from "@src/domain/entities/auth-session.entity";
import { RefreshToken, type RefreshTokenRecord } from "@src/domain/entities/refresh-token.entity";
import {
  AuthSessionRepository,
  RefreshTokenWithSession,
} from "@src/domain/ports/auth-session.repository";

/** Sinal interno de `rotate`: um compare-and-set não casou e a transação precisa ser desfeita. */
class RotationLostError extends Error {}

export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async create(session: AuthSession, firstToken: RefreshToken): Promise<void> {
    await this.prisma.authSession.create({
      data: {
        id: session.id,
        userId: session.userId,
        authMethod: session.authMethod,
        status: session.status,
        createdAt: session.createdAt,
        lastUsedAt: session.lastUsedAt,
        expiresAt: session.expiresAt,
        revokedAt: session.revokedAt,
        revokedReason: session.revokedReason,
        refreshTokens: { create: PrismaAuthSessionRepository.toTokenData(firstToken) },
      },
    });
  }

  public async findSessionById(id: string): Promise<AuthSession | null> {
    const record = await this.prisma.authSession.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaAuthSessionRepository.toSessionDomain(record);
  }

  public async findTokenByHash(tokenHash: string): Promise<RefreshTokenWithSession | null> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { session: true },
    });
    if (!record) return null;
    return {
      token: PrismaAuthSessionRepository.toTokenDomain(record),
      session: PrismaAuthSessionRepository.toSessionDomain(record.session),
    };
  }

  /**
   * Sessão antes do token (a mesma ordem de `revokeSession`, para não haver deadlock), cada passo
   * um compare-and-set; o `UNIQUE` de `parent_token_id` impede um segundo sucessor mesmo se o
   * isolamento falhar. Qualquer passo que não casa desfaz os anteriores.
   */
  public async rotate(currentTokenId: string, next: RefreshToken, now: Date): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        const session = await tx.authSession.updateMany({
          where: { id: next.sessionId, status: "ACTIVE", expiresAt: { gt: now } },
          data: { lastUsedAt: now },
        });
        if (session.count !== 1) throw new RotationLostError();

        const current = await tx.refreshToken.updateMany({
          where: {
            id: currentTokenId,
            sessionId: next.sessionId,
            status: "ACTIVE",
            expiresAt: { gt: now },
          },
          data: { status: "ROTATED", rotatedAt: now },
        });
        if (current.count !== 1) throw new RotationLostError();

        await tx.refreshToken.create({
          data: {
            ...PrismaAuthSessionRepository.toTokenData(next),
            sessionId: next.sessionId,
            parentTokenId: currentTokenId,
          },
        });
      });
      return true;
    } catch (error) {
      if (
        error instanceof RotationLostError ||
        PrismaAuthSessionRepository.isUniqueViolation(error)
      ) {
        return false;
      }
      throw error;
    }
  }

  public async revokeSession(
    sessionId: string,
    reason: SessionRevocationReason,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { id: sessionId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: now, revokedReason: reason },
      });
      await tx.refreshToken.updateMany({
        where: { sessionId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: now },
      });
    });
  }

  public async revokeAllForUser(
    userId: string,
    reason: SessionRevocationReason,
    now: Date,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: now, revokedReason: reason },
      });
      await tx.refreshToken.updateMany({
        where: { session: { userId }, status: "ACTIVE" },
        data: { status: "REVOKED", revokedAt: now },
      });
    });
  }

  /** Os tokens das sessões apagadas vão junto pelo `ON DELETE CASCADE`. */
  public async deleteStaleForUser(userId: string, olderThan: Date): Promise<void> {
    await this.prisma.authSession.deleteMany({
      where: {
        userId,
        OR: [{ expiresAt: { lt: olderThan } }, { revokedAt: { lt: olderThan } }],
      },
    });
  }

  private static isUniqueViolation(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
  }

  /** Sem `sessionId`: no `create` aninhado da sessão o Prisma o preenche pela relação. */
  private static toTokenData(token: RefreshToken): Omit<RefreshTokenRecord, "sessionId"> {
    return {
      id: token.id,
      tokenHash: token.tokenHash,
      parentTokenId: token.parentTokenId,
      status: token.status,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      rotatedAt: token.rotatedAt,
      revokedAt: token.revokedAt,
    };
  }

  private static toSessionDomain(record: AuthSessionRecord): AuthSession {
    return AuthSession.rehydrate({
      id: record.id,
      userId: record.userId,
      authMethod: record.authMethod,
      status: record.status,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
      expiresAt: record.expiresAt,
      revokedAt: record.revokedAt,
      revokedReason: record.revokedReason,
    });
  }

  private static toTokenDomain(record: RefreshTokenRecord): RefreshToken {
    return RefreshToken.rehydrate({
      id: record.id,
      sessionId: record.sessionId,
      tokenHash: record.tokenHash,
      parentTokenId: record.parentTokenId,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      rotatedAt: record.rotatedAt,
      revokedAt: record.revokedAt,
    });
  }
}
