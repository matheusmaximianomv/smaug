import { PrismaClient } from "@prisma/client";
import { User } from "@src/domain/entities/user.entity";
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

  public async create(user: User): Promise<User> {
    const record = await this.prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
    return User.create({
      id: record.id,
      name: record.name,
      email: record.email,
      createdAt: record.createdAt,
    });
  }
}
