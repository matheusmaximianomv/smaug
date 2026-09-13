import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaFixedRevenueRepository } from "@src/infrastructure/database/repositories/prisma-fixed-revenue.repository";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";

const TIMESTAMP = new Date("2026-01-01T00:00:00.000Z");

const revenueRecord = {
  id: "fixed-1",
  userId: "user-1",
  modality: "ALTERABLE",
  startMonth: 1,
  startYear: 2026,
  endMonth: null as number | null,
  endYear: null as number | null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

const versionRecord = {
  id: "version-1",
  fixedRevenueId: "fixed-1",
  description: "Salário",
  amount: 8500,
  effectiveMonth: 1,
  effectiveYear: 2026,
  createdAt: TIMESTAMP,
};

describe("PrismaFixedRevenueRepository", () => {
  const fixedRevenue = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const fixedRevenueVersion = { findMany: vi.fn(), create: vi.fn() };

  const repository = new PrismaFixedRevenueRepository({
    fixedRevenue,
    fixedRevenueVersion,
  } as unknown as PrismaClient);

  const revenue = FixedRevenue.create(revenueRecord as never);
  const version = FixedRevenueVersion.create(versionRecord);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map a found revenue to the domain entity", async () => {
    fixedRevenue.findUnique.mockResolvedValue(revenueRecord);

    const result = await repository.findById("fixed-1");

    expect(fixedRevenue.findUnique).toHaveBeenCalledWith({ where: { id: "fixed-1" } });
    expect(result).toBeInstanceOf(FixedRevenue);
    expect(result?.endMonth).toBeNull();
  });

  it("should return null when the revenue does not exist", async () => {
    fixedRevenue.findUnique.mockResolvedValue(null);

    await expect(repository.findById("fixed-1")).resolves.toBeNull();
  });

  it("should map a terminated revenue keeping its end competence", async () => {
    fixedRevenue.findUnique.mockResolvedValue({
      ...revenueRecord,
      endMonth: 12,
      endYear: 2026,
    });

    const result = await repository.findById("fixed-1");

    expect(result?.endMonth).toBe(12);
    expect(result?.endYear).toBe(2026);
  });

  it("should load the revenue together with its versions", async () => {
    fixedRevenue.findUnique.mockResolvedValue({ ...revenueRecord, versions: [versionRecord] });

    const result = await repository.findByIdWithVersions("fixed-1");

    expect(fixedRevenue.findUnique).toHaveBeenCalledWith({
      where: { id: "fixed-1" },
      include: { versions: { orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }] } },
    });
    expect(result?.revenue).toBeInstanceOf(FixedRevenue);
    expect(result?.versions[0]).toBeInstanceOf(FixedRevenueVersion);
  });

  it("should return null when loading versions of a missing revenue", async () => {
    fixedRevenue.findUnique.mockResolvedValue(null);

    await expect(repository.findByIdWithVersions("fixed-1")).resolves.toBeNull();
  });

  it("should list every revenue of the user", async () => {
    fixedRevenue.findMany.mockResolvedValue([revenueRecord]);

    const result = await repository.findAllByUser("user-1");

    expect(fixedRevenue.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
    expect(result).toHaveLength(1);
  });

  it("should keep only the revenues active in the competence", async () => {
    fixedRevenue.findMany.mockResolvedValue([
      revenueRecord,
      { ...revenueRecord, id: "fixed-2", startMonth: 6, startYear: 2026 },
    ]);

    const result = await repository.findActiveForCompetence("user-1", 2026, 3);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("fixed-1");
  });

  it("should persist the revenue with its initial version", async () => {
    fixedRevenue.create.mockResolvedValue(revenueRecord);

    const result = await repository.create(revenue, version);

    expect(fixedRevenue.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: revenue.id,
        userId: revenue.userId,
        modality: "ALTERABLE",
        versions: {
          create: {
            id: version.id,
            description: version.description,
            amount: version.amount,
            effectiveMonth: version.effectiveMonth,
            effectiveYear: version.effectiveYear,
            createdAt: version.createdAt,
          },
        },
      }),
    });
    expect(result).toBeInstanceOf(FixedRevenue);
  });

  it("should persist only the end competence on update", async () => {
    const terminated = revenue.terminate(8, 2026);
    fixedRevenue.update.mockResolvedValue({ ...revenueRecord, endMonth: 8, endYear: 2026 });

    const result = await repository.update(terminated);

    expect(fixedRevenue.update).toHaveBeenCalledWith({
      where: { id: terminated.id },
      data: { endMonth: 8, endYear: 2026, updatedAt: terminated.updatedAt },
    });
    expect(result.endMonth).toBe(8);
  });

  it("should delete a revenue", async () => {
    await repository.delete("fixed-1");

    expect(fixedRevenue.delete).toHaveBeenCalledWith({ where: { id: "fixed-1" } });
  });

  it("should append a version", async () => {
    fixedRevenueVersion.create.mockResolvedValue(versionRecord);

    const result = await repository.addVersion(version);

    expect(fixedRevenueVersion.create).toHaveBeenCalledWith({
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
    expect(result).toBeInstanceOf(FixedRevenueVersion);
  });

  it("should list the versions of a revenue in chronological order", async () => {
    fixedRevenueVersion.findMany.mockResolvedValue([versionRecord]);

    const result = await repository.findVersionsForRevenue("fixed-1");

    expect(fixedRevenueVersion.findMany).toHaveBeenCalledWith({
      where: { fixedRevenueId: "fixed-1" },
      orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }],
    });
    expect(result).toHaveLength(1);
  });

  it("should resolve the version in effect for a month", async () => {
    fixedRevenueVersion.findMany.mockResolvedValue([versionRecord]);

    const result = await repository.findVersionForMonth("fixed-1", 3, 2026);

    expect(fixedRevenueVersion.findMany).toHaveBeenCalledWith({
      where: {
        fixedRevenueId: "fixed-1",
        OR: [{ effectiveYear: { lt: 2026 } }, { effectiveYear: 2026, effectiveMonth: { lte: 3 } }],
      },
      orderBy: [{ effectiveYear: "desc" }, { effectiveMonth: "desc" }],
      take: 1,
    });
    expect(result).toBeInstanceOf(FixedRevenueVersion);
  });

  it("should return null when no version is in effect for the month", async () => {
    fixedRevenueVersion.findMany.mockResolvedValue([]);

    await expect(repository.findVersionForMonth("fixed-1", 3, 2026)).resolves.toBeNull();
  });
});
