import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/get-fixed-revenue.use-case";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("GetFixedRevenueUseCase", () => {
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new GetFixedRevenueUseCase(repository);

  const revenue = FixedRevenue.create({
    id: "fixed-1",
    userId: "user-1",
    modality: "ALTERABLE",
    startMonth: 3,
    startYear: 2026,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return the revenue with its versions", async () => {
    const stored = { revenue, versions: [] };
    repository.findByIdWithVersions.mockResolvedValue(stored);

    const result = await useCase.execute({ id: "fixed-1", userId: "user-1" });

    expect(result).toBe(stored);
  });

  it("should throw FixedRevenueNotFoundError when the revenue does not exist", async () => {
    repository.findByIdWithVersions.mockResolvedValue(null);

    await expect(useCase.execute({ id: "fixed-1", userId: "user-1" })).rejects.toThrow(
      FixedRevenueNotFoundError,
    );
  });

  it("should throw FixedRevenueNotFoundError when the revenue belongs to another user", async () => {
    repository.findByIdWithVersions.mockResolvedValue({ revenue, versions: [] });

    await expect(useCase.execute({ id: "fixed-1", userId: "other-user" })).rejects.toThrow(
      FixedRevenueNotFoundError,
    );
  });
});
