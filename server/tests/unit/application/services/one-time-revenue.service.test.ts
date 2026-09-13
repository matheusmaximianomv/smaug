import { describe, it, expect, beforeEach, vi } from "vitest";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import type { CreateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import type { UpdateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import type { DeleteOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/delete-one-time-revenue.use-case";
import type { ListOneTimeRevenuesUseCase } from "@src/domain/use-cases/one-time-revenue/list-one-time-revenues.use-case";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

describe("OneTimeRevenueService", () => {
  const createUseCase = { execute: vi.fn() };
  const updateUseCase = { execute: vi.fn() };
  const deleteUseCase = { execute: vi.fn() };
  const listUseCase = { execute: vi.fn() };

  const service = new OneTimeRevenueService(
    createUseCase as unknown as CreateOneTimeRevenueUseCase,
    updateUseCase as unknown as UpdateOneTimeRevenueUseCase,
    deleteUseCase as unknown as DeleteOneTimeRevenueUseCase,
    listUseCase as unknown as ListOneTimeRevenuesUseCase,
  );

  const revenue = OneTimeRevenue.create({
    id: "rev-1",
    userId: "user-1",
    description: "Bônus",
    amount: 1200,
    competenceMonth: 3,
    competenceYear: 2026,
    createdAt: new Date("2026-03-01T00:00:00.000Z"),
    updatedAt: new Date("2026-03-02T00:00:00.000Z"),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should map the created revenue to a response DTO", async () => {
    createUseCase.execute.mockResolvedValue(revenue);

    const result = await service.create("user-1", {
      description: "Bônus",
      amount: 1200,
      competenceMonth: 3,
      competenceYear: 2026,
    });

    expect(createUseCase.execute).toHaveBeenCalledWith({
      userId: "user-1",
      description: "Bônus",
      amount: 1200,
      competenceMonth: 3,
      competenceYear: 2026,
    });
    expect(result).toEqual({
      id: "rev-1",
      userId: "user-1",
      description: "Bônus",
      amount: 1200,
      competenceYear: 2026,
      competenceMonth: 3,
      createdAt: "2026-03-01T00:00:00.000Z",
      updatedAt: "2026-03-02T00:00:00.000Z",
    });
  });

  it("should map the updated revenue to a response DTO", async () => {
    updateUseCase.execute.mockResolvedValue(revenue);

    const result = await service.update("user-1", "rev-1", { amount: 1500 });

    expect(updateUseCase.execute).toHaveBeenCalledWith({
      id: "rev-1",
      userId: "user-1",
      amount: 1500,
    });
    expect(result.id).toBe("rev-1");
  });

  it("should delegate deletion", async () => {
    await service.delete("user-1", "rev-1");

    expect(deleteUseCase.execute).toHaveBeenCalledWith({ id: "rev-1", userId: "user-1" });
  });

  it("should list revenues applying the competence filters", async () => {
    listUseCase.execute.mockResolvedValue([revenue]);

    const result = await service.list("user-1", { competenceYear: 2026, competenceMonth: 3 });

    expect(listUseCase.execute).toHaveBeenCalledWith({
      userId: "user-1",
      competenceYear: 2026,
      competenceMonth: 3,
    });
    expect(result).toHaveLength(1);
  });

  it("should list revenues without filters", async () => {
    listUseCase.execute.mockResolvedValue([]);

    const result = await service.list("user-1");

    expect(listUseCase.execute).toHaveBeenCalledWith({
      userId: "user-1",
      competenceYear: undefined,
      competenceMonth: undefined,
    });
    expect(result).toEqual([]);
  });
});
