import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  DeleteFixedRevenueUseCase,
  FixedRevenueNotFoundError,
} from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("DeleteFixedRevenueUseCase", () => {
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new DeleteFixedRevenueUseCase(repository);

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

  it("should delete the revenue", async () => {
    repository.findById.mockResolvedValue(revenue);

    await useCase.execute({ id: "fixed-1", userId: "user-1" });

    expect(repository.delete).toHaveBeenCalledWith("fixed-1");
  });

  it("should throw FixedRevenueNotFoundError when the revenue does not exist", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ id: "fixed-1", userId: "user-1" })).rejects.toThrow(
      FixedRevenueNotFoundError,
    );
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it("should throw FixedRevenueNotFoundError when the revenue belongs to another user", async () => {
    repository.findById.mockResolvedValue(revenue);

    await expect(useCase.execute({ id: "fixed-1", userId: "other-user" })).rejects.toThrow(
      FixedRevenueNotFoundError,
    );
  });

  it("should expose the FIXED_REVENUE_NOT_FOUND code", () => {
    const error = new FixedRevenueNotFoundError("fixed-1");
    expect(error.code).toBe("FIXED_REVENUE_NOT_FOUND");
    expect(error.name).toBe("FixedRevenueNotFoundError");
    expect(error.message).toBe('Fixed revenue with id "fixed-1" not found');
  });
});
