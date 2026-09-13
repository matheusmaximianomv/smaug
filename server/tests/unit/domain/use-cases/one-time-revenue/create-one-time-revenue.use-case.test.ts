import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CreateOneTimeRevenueUseCase,
  PastCompetenceError,
} from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

describe("CreateOneTimeRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");

  const repository: OneTimeRevenueRepository = {
    findById: vi.fn(),
    findAllByUser: vi.fn(),
    findByUserAndCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new CreateOneTimeRevenueUseCase(repository);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const input = {
    userId: "user-1",
    description: "Bônus",
    amount: 1200,
    competenceMonth: 3,
    competenceYear: 2026,
  };

  it("should create revenue for the current month", async () => {
    const created = OneTimeRevenue.create({ ...input, id: "rev-1" });
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const result = await useCase.execute(input);

    expect(repository.create).toHaveBeenCalledWith(expect.any(OneTimeRevenue));
    expect(result).toBe(created);
  });

  it("should create revenue for a future month", async () => {
    const future = { ...input, competenceMonth: 12, competenceYear: 2026 };
    const created = OneTimeRevenue.create({ ...future, id: "rev-2" });
    (repository.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const result = await useCase.execute(future);

    expect(result).toBe(created);
  });

  it("should throw PastCompetenceError for a past month", async () => {
    await expect(useCase.execute({ ...input, competenceMonth: 2 })).rejects.toThrow(
      PastCompetenceError,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("should expose the PAST_COMPETENCE code", () => {
    const error = new PastCompetenceError();
    expect(error.code).toBe("PAST_COMPETENCE");
    expect(error.name).toBe("PastCompetenceError");
    expect(error.message).toBe("Cannot create revenue for a past month");
  });
});
