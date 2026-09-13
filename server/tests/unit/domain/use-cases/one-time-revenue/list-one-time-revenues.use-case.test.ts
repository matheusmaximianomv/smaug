import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListOneTimeRevenuesUseCase } from "@src/domain/use-cases/one-time-revenue/list-one-time-revenues.use-case";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";

describe("ListOneTimeRevenuesUseCase", () => {
  const repository: OneTimeRevenueRepository = {
    findById: vi.fn(),
    findAllByUser: vi.fn(),
    findByUserAndCompetence: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const useCase = new ListOneTimeRevenuesUseCase(repository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter by competence when year and month are provided", async () => {
    (repository.findByUserAndCompetence as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const result = await useCase.execute({
      userId: "user-1",
      competenceYear: 2026,
      competenceMonth: 3,
    });

    expect(repository.findByUserAndCompetence).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(repository.findAllByUser).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("should list all revenues when no filter is provided", async () => {
    (repository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await useCase.execute({ userId: "user-1" });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
    expect(repository.findByUserAndCompetence).not.toHaveBeenCalled();
  });

  it("should list all revenues when only the year is provided", async () => {
    (repository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await useCase.execute({ userId: "user-1", competenceYear: 2026 });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
  });

  it("should list all revenues when only the month is provided", async () => {
    (repository.findAllByUser as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await useCase.execute({ userId: "user-1", competenceMonth: 3 });

    expect(repository.findAllByUser).toHaveBeenCalledWith("user-1");
  });
});
