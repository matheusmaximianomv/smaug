import { PrismaClient } from "@prisma/client";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { FixedRevenueModality } from "@src/domain/entities/fixed-revenue.entity";

export class PrismaFixedRevenueRepository implements FixedRevenueRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<FixedRevenue | null> {
    const record = await this.prisma.fixedRevenue.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaFixedRevenueRepository.toRevenueDomain(record);
  }

  async findByIdWithVersions(
    id: string,
  ): Promise<{ revenue: FixedRevenue; versions: FixedRevenueVersion[] } | null> {
    const record = await this.prisma.fixedRevenue.findUnique({
      where: { id },
      include: { versions: { orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }] } },
    });
    if (!record) return null;
    return {
      revenue: PrismaFixedRevenueRepository.toRevenueDomain(record),
      versions: record.versions.map(PrismaFixedRevenueRepository.toVersionDomain),
    };
  }

  async findAllByUser(userId: string): Promise<FixedRevenue[]> {
    const records = await this.prisma.fixedRevenue.findMany({
      where: { userId },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
    return records.map(PrismaFixedRevenueRepository.toRevenueDomain);
  }

  async findActiveForCompetence(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<FixedRevenue[]> {
    const all = await this.prisma.fixedRevenue.findMany({ where: { userId } });
    return all
      .map(PrismaFixedRevenueRepository.toRevenueDomain)
      .filter((r: FixedRevenue) => r.isActiveForMonth(competenceMonth, competenceYear));
  }

  async create(revenue: FixedRevenue, initialVersion: FixedRevenueVersion): Promise<FixedRevenue> {
    const record = await this.prisma.fixedRevenue.create({
      data: {
        id: revenue.id,
        userId: revenue.userId,
        modality: revenue.modality,
        startMonth: revenue.startMonth,
        startYear: revenue.startYear,
        endMonth: revenue.endMonth,
        endYear: revenue.endYear,
        createdAt: revenue.createdAt,
        updatedAt: revenue.updatedAt,
        versions: {
          create: {
            id: initialVersion.id,
            description: initialVersion.description,
            amount: initialVersion.amount,
            effectiveMonth: initialVersion.effectiveMonth,
            effectiveYear: initialVersion.effectiveYear,
            createdAt: initialVersion.createdAt,
          },
        },
      },
    });
    return PrismaFixedRevenueRepository.toRevenueDomain(record);
  }

  async update(revenue: FixedRevenue): Promise<FixedRevenue> {
    const record = await this.prisma.fixedRevenue.update({
      where: { id: revenue.id },
      data: {
        endMonth: revenue.endMonth,
        endYear: revenue.endYear,
        updatedAt: revenue.updatedAt,
      },
    });
    return PrismaFixedRevenueRepository.toRevenueDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fixedRevenue.delete({ where: { id } });
  }

  async addVersion(version: FixedRevenueVersion): Promise<FixedRevenueVersion> {
    const record = await this.prisma.fixedRevenueVersion.create({
      data: {
        id: version.id,
        fixedRevenueId: version.fixedRevenueId,
        description: version.description,
        amount: version.amount,
        effectiveMonth: version.effectiveMonth,
        effectiveYear: version.effectiveYear,
        createdAt: version.createdAt,
      },
    });
    return PrismaFixedRevenueRepository.toVersionDomain(record);
  }

  async findVersionsForRevenue(fixedRevenueId: string): Promise<FixedRevenueVersion[]> {
    const records = await this.prisma.fixedRevenueVersion.findMany({
      where: { fixedRevenueId },
      orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }],
    });
    return records.map(PrismaFixedRevenueRepository.toVersionDomain);
  }

  async findVersionForMonth(
    fixedRevenueId: string,
    month: number,
    year: number,
  ): Promise<FixedRevenueVersion | null> {
    const versions = await this.prisma.fixedRevenueVersion.findMany({
      where: {
        fixedRevenueId,
        OR: [
          { effectiveYear: { lt: year } },
          { effectiveYear: year, effectiveMonth: { lte: month } },
        ],
      },
      orderBy: [{ effectiveYear: "desc" }, { effectiveMonth: "desc" }],
      take: 1,
    });
    if (versions.length === 0) return null;
    return PrismaFixedRevenueRepository.toVersionDomain(versions[0]);
  }

  private static toRevenueDomain(record: {
    id: string;
    userId: string;
    modality: string;
    startMonth: number;
    startYear: number;
    endMonth: number | null;
    endYear: number | null;
    createdAt: Date;
    updatedAt: Date;
  }): FixedRevenue {
    return FixedRevenue.create({
      id: record.id,
      userId: record.userId,
      modality: record.modality as FixedRevenueModality,
      startMonth: record.startMonth,
      startYear: record.startYear,
      endMonth: record.endMonth,
      endYear: record.endYear,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  private static toVersionDomain(record: {
    id: string;
    fixedRevenueId: string;
    description: string;
    amount: number;
    effectiveMonth: number;
    effectiveYear: number;
    createdAt: Date;
  }): FixedRevenueVersion {
    return FixedRevenueVersion.create({
      id: record.id,
      fixedRevenueId: record.fixedRevenueId,
      description: record.description,
      amount: record.amount,
      effectiveMonth: record.effectiveMonth,
      effectiveYear: record.effectiveYear,
      createdAt: record.createdAt,
    });
  }
}
