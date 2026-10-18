import { Prisma, PrismaClient } from "@prisma/client";
import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "@src/domain/errors/domain-error";
import { UserRepository } from "@src/domain/ports/user.repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    if (!record) return null;
    return User.create({
      id: record.id,
      name: record.name,
      email: record.email,
      createdAt: record.createdAt,
    });
  }

  public async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    if (!record) return null;
    return User.create({
      id: record.id,
      name: record.name,
      email: record.email,
      createdAt: record.createdAt,
    });
  }

  public async createWithPasswordCredential(
    user: User,
    credential: PasswordCredential,
  ): Promise<User> {
    try {
      const record = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
        });
        await tx.passwordCredential.create({
          data: {
            userId: credential.userId,
            passwordHash: credential.passwordHash,
            pepperId: credential.pepperId,
            createdAt: credential.createdAt,
            updatedAt: credential.updatedAt,
          },
        });
        return created;
      });
      return User.create({
        id: record.id,
        name: record.name,
        email: record.email,
        createdAt: record.createdAt,
      });
    } catch (error) {
      if (PrismaUserRepository.isEmailConflict(error)) {
        throw new EmailAlreadyExistsError(user.email);
      }
      throw error;
    }
  }

  /**
   * P2002 no índice único de `email`. O formato do `meta` muda por driver adapter (o SQLite
   * informa as colunas, o PostgreSQL o nome do índice `t_users_email_key`); os dois citam `email`.
   */
  private static isEmailConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      `${JSON.stringify(error.meta)}`.includes("email")
    );
  }
}
