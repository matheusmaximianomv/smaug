import { describe, it, expect, beforeEach, vi } from "vitest";
import { RevenueQueryService } from "@src/application/services/revenue-query.service";
import type { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import type { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import {
  createFixedRevenueRepositoryMock,
  createOneTimeRevenueRepositoryMock,
} from "../../../helpers/repository-mocks";

describe("RevenueQueryService", () => {
  const oneTimeRepository = createOneTimeRevenueRepositoryMock();
  const fixedRepository = createFixedRevenueRepositoryMock();

  const service = new RevenueQueryService(
    oneTimeRepository as unknown as OneTimeRevenueRepository,
    fixedRepository as unknown as FixedRevenueRepository,
  );

  const buildOneTime = (amount: number, id: string) =>
    OneTimeRevenue.create({
      id,
      userId: "user-1",
      description: "Bônus",
      amount,
      competenceMonth: 3,
      competenceYear: 2026,
    });

  const buildFixed = (id: string) =>
    FixedRevenue.create({
      id,
      userId: "user-1",
      modality: "ALTERABLE",
      startMonth: 1,
      startYear: 2026,
    });

  const buildVersion = (fixedRevenueId: string, amount: number) =>
    FixedRevenueVersion.create({
      fixedRevenueId,
      description: "Salário",
      amount,
      effectiveMonth: 1,
      effectiveYear: 2026,
    });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should consolidate one-time and fixed revenues with their totals", async () => {
    oneTimeRepository.findByUserAndCompetence.mockResolvedValue([
      buildOneTime(1200.55, "rev-1"),
      buildOneTime(300.2, "rev-2"),
    ]);
    fixedRepository.findActiveForCompetence.mockResolvedValue([buildFixed("fixed-1")]);
    fixedRepository.findVersionForMonth.mockResolvedValue(buildVersion("fixed-1", 8500.25));

    const result = await service.getConsolidatedRevenues("user-1", 2026, 3);

    expect(oneTimeRepository.findByUserAndCompetence).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(fixedRepository.findActiveForCompetence).toHaveBeenCalledWith("user-1", 2026, 3);
    expect(fixedRepository.findVersionForMonth).toHaveBeenCalledWith("fixed-1", 3, 2026);
    expect(result.competenceYear).toBe(2026);
    expect(result.competenceMonth).toBe(3);
    expect(result.oneTimeRevenues).toHaveLength(2);
    expect(result.fixedRevenues).toHaveLength(1);
    expect(result.fixedRevenues[0].currentVersion.amount).toBe(8500.25);
    expect(result.totals).toEqual({
      oneTimeTotal: 1500.75,
      fixedTotal: 8500.25,
      total: 10001,
    });
  });

  it("should skip active fixed revenues without a version for the month", async () => {
    oneTimeRepository.findByUserAndCompetence.mockResolvedValue([]);
    fixedRepository.findActiveForCompetence.mockResolvedValue([buildFixed("fixed-1")]);
    fixedRepository.findVersionForMonth.mockResolvedValue(null);

    const result = await service.getConsolidatedRevenues("user-1", 2026, 3);

    expect(result.fixedRevenues).toEqual([]);
    expect(result.totals).toEqual({ oneTimeTotal: 0, fixedTotal: 0, total: 0 });
  });

  it("should return zeroed totals when there are no revenues", async () => {
    oneTimeRepository.findByUserAndCompetence.mockResolvedValue([]);
    fixedRepository.findActiveForCompetence.mockResolvedValue([]);

    const result = await service.getConsolidatedRevenues("user-1", 2026, 3);

    expect(result.oneTimeRevenues).toEqual([]);
    expect(result.fixedRevenues).toEqual([]);
    expect(fixedRepository.findVersionForMonth).not.toHaveBeenCalled();
  });
});
