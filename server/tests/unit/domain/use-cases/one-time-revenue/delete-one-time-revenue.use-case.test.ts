import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeleteOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/delete-one-time-revenue.use-case";
import {
  RevenueNotFoundError,
  PastCompetenceEditError,
} from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

describe("DeleteOneTimeRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");

  const repository: OneTimeRevenueRepository = {
    findById: vi.fn(),
    findAllByUser: vi.fn(),
    findByUserAndCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new DeleteOneTimeRevenueUseCase(repository);

  const buildRevenue = (overrides: Partial<{ competenceMonth: number; userId: string }> = {}) =>
    OneTimeRevenue.create({
      id: "rev-1",
      userId: overrides.userId ?? "user-1",
      description: "Bônus",
      amount: 1200,
      competenceMonth: overrides.competenceMonth ?? 3,
      competenceYear: 2026,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should delete a revenue in the current month", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(buildRevenue());

    await useCase.execute({ id: "rev-1", userId: "user-1" });

    expect(repository.delete).toHaveBeenCalledWith("rev-1");
  });

  it("should throw RevenueNotFoundError when the revenue does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "rev-1", userId: "user-1" })).rejects.toThrow(
      RevenueNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw RevenueNotFoundError when the revenue belongs to another user", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRevenue({ userId: "other-user" }),
    );

    await expect(useCase.execute({ id: "rev-1", userId: "user-1" })).rejects.toThrow(
      RevenueNotFoundError,
    );
  });

  it("should throw PastCompetenceEditError for a revenue in a past month", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
      buildRevenue({ competenceMonth: 1 }),
    );

    await expect(useCase.execute({ id: "rev-1", userId: "user-1" })).rejects.toThrow(
      PastCompetenceEditError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
