import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListFixedRevenuesUseCase } from "@src/domain/use-cases/fixed-revenue/list-fixed-revenues.use-case";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("ListFixedRevenuesUseCase", () => {
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new ListFixedRevenuesUseCase(repository);

  beforeEach(() => {
    vi.clearAllMocks();
    repository.findActiveForCompetence.mockResolvedValue([]);
    repository.findAllByUser.mockResolvedValue([]);
  });

  it("should filter active revenues when year and month are provided", async () => {
    await useCase.execute({ userId: "user-1", competenceYear: 2026, competenceMonth: 3 });

    expect(repository.findActiveForCompetence).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(repository.findAllByUser).not.toHaveBeenCalled();
  });

  it("should list all revenues when no filter is provided", async () => {
    await useCase.execute({ userId: "user-1" });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
    expect(repository.findActiveForCompetence).not.toHaveBeenCalled();
  });

  it("should list all revenues when only the year is provided", async () => {
    await useCase.execute({ userId: "user-1", competenceYear: 2026 });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
  });

  it("should list all revenues when only the month is provided", async () => {
    await useCase.execute({ userId: "user-1", competenceMonth: 3 });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
  });
});
