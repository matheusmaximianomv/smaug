import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  CreateFixedRevenueUseCase,
  PastStartDateError,
} from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("CreateFixedRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new CreateFixedRevenueUseCase(repository);

  const input = {
    userId: "user-1",
    description: "Salário",
    amount: 8500,
    modality: "ALTERABLE" as const,
    startMonth: 3,
    startYear: 2026,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create the revenue with its initial version", async () => {
    const result = await useCase.execute(input);

    expect(repository.create).toHaveBeenCalledWith(
      expect.any(FixedRevenue),
      expect.any(FixedRevenueVersion),
    );
    expect(result.revenue.modality).toBe("ALTERABLE");
    expect(result.revenue.endMonth).toBeNull();
    expect(result.version.description).toBe("Salário");
    expect(result.version.amount).toBe(8500);
    expect(result.version.fixedRevenueId).toBe(result.revenue.id);
  });

  it("should create the revenue with an end competence", async () => {
    const result = await useCase.execute({ ...input, endMonth: 12, endYear: 2026 });

    expect(result.revenue.endMonth).toBe(12);
    expect(result.revenue.endYear).toBe(2026);
  });

  it("should create an UNALTERABLE revenue", async () => {
    const result = await useCase.execute({ ...input, modality: "UNALTERABLE" });

    expect(result.revenue.modality).toBe("UNALTERABLE");
  });

  it("should throw PastStartDateError when the start month is in the past", async () => {
    await expect(useCase.execute({ ...input, startMonth: 2 })).rejects.toThrow(PastStartDateError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("should expose the PAST_START_DATE code", () => {
    const error = new PastStartDateError();
    expect(error.code).toBe("PAST_START_DATE");
    expect(error.name).toBe("PastStartDateError");
    expect(error.message).toBe("Start date must be current or future month");
  });
});
