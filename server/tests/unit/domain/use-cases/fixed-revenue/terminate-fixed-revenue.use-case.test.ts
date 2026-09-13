import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  TerminateFixedRevenueUseCase,
  AlreadyExpiredError,
  PastTerminationDateError,
} from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("TerminateFixedRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new TerminateFixedRevenueUseCase(repository);

  const buildRevenue = (end?: { month: number; year: number }) =>
    FixedRevenue.create({
      id: "fixed-1",
      userId: "user-1",
      modality: "ALTERABLE",
      startMonth: 1,
      startYear: 2026,
      endMonth: end?.month ?? null,
      endYear: end?.year ?? null,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    repository.update.mockImplementation(async (revenue) => revenue);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should terminate a revenue without an end competence", async () => {
    repository.findById.mockResolvedValue(buildRevenue());

    const result = await useCase.execute({
      id: "fixed-1",
      userId: "user-1",
      endMonth: 6,
      endYear: 2026,
    });

    expect(result.endMonth).toBe(6);
    expect(result.endYear).toBe(2026);
    expect(repository.update).toHaveBeenCalledWith(expect.any(FixedRevenue));
  });

  it("should terminate a revenue whose current end competence is still in the future", async () => {
    repository.findById.mockResolvedValue(buildRevenue({ month: 12, year: 2026 }));

    const result = await useCase.execute({
      id: "fixed-1",
      userId: "user-1",
      endMonth: 8,
      endYear: 2026,
    });

    expect(result.endMonth).toBe(8);
  });

  it("should throw FixedRevenueNotFoundError when the revenue does not exist", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ id: "fixed-1", userId: "user-1", endMonth: 6, endYear: 2026 }),
    ).rejects.toThrow(FixedRevenueNotFoundError);
  });

  it("should throw FixedRevenueNotFoundError when the revenue belongs to another user", async () => {
    repository.findById.mockResolvedValue(buildRevenue());

    await expect(
      useCase.execute({ id: "fixed-1", userId: "other-user", endMonth: 6, endYear: 2026 }),
    ).rejects.toThrow(FixedRevenueNotFoundError);
  });

  it("should throw AlreadyExpiredError when the current end competence is in the past", async () => {
    repository.findById.mockResolvedValue(buildRevenue({ month: 2, year: 2026 }));

    await expect(
      useCase.execute({ id: "fixed-1", userId: "user-1", endMonth: 6, endYear: 2026 }),
    ).rejects.toThrow(AlreadyExpiredError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("should throw PastTerminationDateError when the new end competence is in the past", async () => {
    repository.findById.mockResolvedValue(buildRevenue());

    await expect(
      useCase.execute({ id: "fixed-1", userId: "user-1", endMonth: 2, endYear: 2026 }),
    ).rejects.toThrow(PastTerminationDateError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("should expose the error codes", () => {
    const expired = new AlreadyExpiredError();
    expect(expired.code).toBe("ALREADY_EXPIRED");
    expect(expired.name).toBe("AlreadyExpiredError");
    expect(expired.message).toBe("Fixed revenue has already expired");

    const pastTermination = new PastTerminationDateError();
    expect(pastTermination.code).toBe("PAST_TERMINATION_DATE");
    expect(pastTermination.name).toBe("PastTerminationDateError");
    expect(pastTermination.message).toBe("Termination date must be current or future month");
  });
});
