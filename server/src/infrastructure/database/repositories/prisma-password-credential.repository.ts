import { PrismaClient } from "@prisma/client";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { PasswordCredentialRepository } from "@src/domain/ports/password-credential.repository";

export class PrismaPasswordCredentialRepository implements PasswordCredentialRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findByUserId(userId: string): Promise<PasswordCredential | null> {
    const record = await this.prisma.passwordCredential.findUnique({ where: { userId } });
    if (!record) return null;
    return PrismaPasswordCredentialRepository.toDomain(record);
  }

  public async update(credential: PasswordCredential): Promise<PasswordCredential> {
    const record = await this.prisma.passwordCredential.update({
      where: { userId: credential.userId },
      data: {
        passwordHash: credential.passwordHash,
        pepperId: credential.pepperId,
        updatedAt: credential.updatedAt,
      },
    });
    return PrismaPasswordCredentialRepository.toDomain(record);
  }

  private static toDomain(record: {
    userId: string;
    passwordHash: string;
    pepperId: string;
    createdAt: Date;
    updatedAt: Date;
  }): PasswordCredential {
    return PasswordCredential.create({
      userId: record.userId,
      passwordHash: record.passwordHash,
      pepperId: record.pepperId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
