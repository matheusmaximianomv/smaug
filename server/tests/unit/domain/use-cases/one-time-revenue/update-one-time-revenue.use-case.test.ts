import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  UpdateOneTimeRevenueUseCase,
  RevenueNotFoundError,
  PastCompetenceEditError,
} from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

describe("UpdateOneTimeRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");

  const repository: OneTimeRevenueRepository = {
    findById: vi.fn(),
    findAllByUser: vi.fn(),
    findByUserAndCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new UpdateOneTimeRevenueUseCase(repository);

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

  it("should update description and amount", async () => {
    const revenue = buildRevenue();
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(revenue);
    (repository.update as ReturnType<typeof vi.fn>).mockImplementation(async (r) => r);

    const result = await useCase.execute({
      id: "rev-1",
      userId: "user-1",
      description: "Bônus anual",
      amount: 1500,
    });

    expect(result.description).toBe("Bônus anual");
    expect(result.amount).toBe(1500);
  });

  it("should throw RevenueNotFoundError when the revenue does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(useCase.execute({ id: "rev-1", userId: "user-1" })).rejects.toThrow(
      RevenueNotFoundError,
    );
    expect(repository.update).not.toHaveBeenCalled();
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

    await expect(useCase.execute({ id: "rev-1", userId: "user-1", amount: 10 })).rejects.toThrow(
      PastCompetenceEditError,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("should expose the error codes", () => {
    const notFound = new RevenueNotFoundError("rev-1");
    expect(notFound.code).toBe("REVENUE_NOT_FOUND");
    expect(notFound.name).toBe("RevenueNotFoundError");
    expect(notFound.message).toBe('Revenue with id "rev-1" not found');

    const pastEdit = new PastCompetenceEditError();
    expect(pastEdit.code).toBe("PAST_COMPETENCE");
    expect(pastEdit.name).toBe("PastCompetenceEditError");
    expect(pastEdit.message).toBe("Cannot edit revenue for a past month");
  });
});
