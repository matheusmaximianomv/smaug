import { PrismaClient } from "@prisma/client";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";

export class PrismaOneTimeRevenueRepository implements OneTimeRevenueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<OneTimeRevenue | null> {
    const record = await this.prisma.oneTimeRevenue.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaOneTimeRevenueRepository.toDomain(record);
  }

  async findAllByUser(userId: string): Promise<OneTimeRevenue[]> {
    const records = await this.prisma.oneTimeRevenue.findMany({
      where: { userId },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }],
    });
    return records.map(PrismaOneTimeRevenueRepository.toDomain);
  }

  async findByUserAndCompetence(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<OneTimeRevenue[]> {
    const records = await this.prisma.oneTimeRevenue.findMany({
      where: { userId, competenceYear, competenceMonth },
      orderBy: { createdAt: "desc" },
    });
    return records.map(PrismaOneTimeRevenueRepository.toDomain);
  }

  async create(revenue: OneTimeRevenue): Promise<OneTimeRevenue> {
    const record = await this.prisma.oneTimeRevenue.create({
      data: {
        id: revenue.id,
        userId: revenue.userId,
        description: revenue.description,
        amount: revenue.amount,
        competenceMonth: revenue.competenceMonth,
        competenceYear: revenue.competenceYear,
        createdAt: revenue.createdAt,
        updatedAt: revenue.updatedAt,
      },
    });
    return PrismaOneTimeRevenueRepository.toDomain(record);
  }

  async update(revenue: OneTimeRevenue): Promise<OneTimeRevenue> {
    const record = await this.prisma.oneTimeRevenue.update({
      where: { id: revenue.id },
      data: {
        description: revenue.description,
        amount: revenue.amount,
        updatedAt: revenue.updatedAt,
      },
    });
    return PrismaOneTimeRevenueRepository.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.oneTimeRevenue.delete({ where: { id } });
  }

  private static toDomain(record: {
    id: string;
    userId: string;
    description: string;
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    createdAt: Date;
    updatedAt: Date;
  }): OneTimeRevenue {
    return OneTimeRevenue.create({
      id: record.id,
      userId: record.userId,
      description: record.description,
      amount: record.amount,
      competenceMonth: record.competenceMonth,
      competenceYear: record.competenceYear,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
