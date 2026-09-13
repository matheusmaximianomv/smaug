import { describe, it, expect, beforeEach, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { PrismaOneTimeRevenueRepository } from "@src/infrastructure/database/repositories/prisma-one-time-revenue.repository";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

const TIMESTAMP = new Date("2026-03-01T00:00:00.000Z");

const record = {
  id: "rev-1",
  userId: "user-1",
  description: "Bônus",
  amount: 1200,
  competenceMonth: 3,
  competenceYear: 2026,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
};

describe("PrismaOneTimeRevenueRepository", () => {
  const oneTimeRevenue = {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const repository = new PrismaOneTimeRevenueRepository({
    oneTimeRevenue,
  } as unknown as PrismaClient);

  const revenue = OneTimeRevenue.create(record);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map a found revenue to the domain entity", async () => {
    oneTimeRevenue.findUnique.mockResolvedValue(record);

    const result = await repository.findById("rev-1");

    expect(oneTimeRevenue.findUnique).toHaveBeenCalledWith({ where: { id: "rev-1" } });
    expect(result).toBeInstanceOf(OneTimeRevenue);
    expect(result?.description).toBe("Bônus");
  });

  it("should return null when the revenue does not exist", async () => {
    oneTimeRevenue.findUnique.mockResolvedValue(null);

    await expect(repository.findById("rev-1")).resolves.toBeNull();
  });

  it("should list every revenue of the user ordered by competence", async () => {
    oneTimeRevenue.findMany.mockResolvedValue([record]);

    const result = await repository.findAllByUser("user-1");

    expect(oneTimeRevenue.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }, { createdAt: "desc" }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(OneTimeRevenue);
  });

  it("should list the revenues of a competence", async () => {
    oneTimeRevenue.findMany.mockResolvedValue([]);

    const result = await repository.findByUserAndCompetence("user-1", 2026, 3);

    expect(oneTimeRevenue.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", competenceYear: 2026, competenceMonth: 3 },
      orderBy: { createdAt: "desc" },
    });
    expect(result).toEqual([]);
  });

  it("should persist a new revenue", async () => {
    oneTimeRevenue.create.mockResolvedValue(record);

    const result = await repository.create(revenue);

    expect(oneTimeRevenue.create).toHaveBeenCalledWith({
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
    expect(result).toBeInstanceOf(OneTimeRevenue);
  });

  it("should persist the editable fields on update", async () => {
    oneTimeRevenue.update.mockResolvedValue(record);

    const result = await repository.update(revenue);

    expect(oneTimeRevenue.update).toHaveBeenCalledWith({
      where: { id: revenue.id },
      data: {
        description: revenue.description,
        amount: revenue.amount,
        updatedAt: revenue.updatedAt,
      },
    });
    expect(result).toBeInstanceOf(OneTimeRevenue);
  });

  it("should delete a revenue", async () => {
    await repository.delete("rev-1");

    expect(oneTimeRevenue.delete).toHaveBeenCalledWith({ where: { id: "rev-1" } });
  });
});
