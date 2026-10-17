import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
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

  describe("read API additions", () => {
    const salary = buildFixed("fixed-1");
    const version = (amount: number, effectiveMonth: number) =>
      FixedRevenueVersion.create({
        fixedRevenueId: salary.id,
        description: "Salário",
        amount,
        effectiveMonth,
        effectiveYear: 2026,
      });
    const v1 = version(5000, 1);
    const v2 = version(5500, 5);

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-04-10T12:00:00.000Z"));
      oneTimeRepository.findByUserAndCompetence.mockResolvedValue([]);
      fixedRepository.findActiveForCompetence.mockResolvedValue([salary]);
      fixedRepository.findVersionForMonth.mockImplementation((_id: string, month: number) =>
        Promise.resolve(month >= 5 ? v2 : v1),
      );
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should report the competence status and the server reference month", async () => {
      const past = await service.getConsolidatedRevenues("user-1", 2026, 3);
      const current = await service.getConsolidatedRevenues("user-1", 2026, 4);
      const future = await service.getConsolidatedRevenues("user-1", 2026, 5);

      expect([past, current, future].map((r) => r.competenceStatus)).toEqual([
        "PAST",
        "CURRENT",
        "FUTURE",
      ]);
      expect(current.reference).toEqual({ year: 2026, month: 4 });
    });

    it("should return no previous amount for the only version in its first month", async () => {
      const result = await service.getConsolidatedRevenues("user-1", 2026, 1);

      expect(result.fixedRevenues[0]!.previousAmount).toBeNull();
      expect(fixedRepository.findVersionForMonth).toHaveBeenCalledTimes(1);
    });

    it("should return the previous amount in the month the new version starts", async () => {
      const result = await service.getConsolidatedRevenues("user-1", 2026, 5);

      expect(result.fixedRevenues[0]!.currentVersion.amount).toBe(5500);
      expect(result.fixedRevenues[0]!.previousAmount).toBe(5000);
      expect(fixedRepository.findVersionForMonth).toHaveBeenCalledWith(salary.id, 4, 2026);
    });

    it("should return no previous amount after the adjustment month", async () => {
      const result = await service.getConsolidatedRevenues("user-1", 2026, 6);

      expect(result.fixedRevenues[0]!.previousAmount).toBeNull();
    });

    it("should return no previous amount when the previous month has no version", async () => {
      fixedRepository.findVersionForMonth.mockResolvedValueOnce(v2).mockResolvedValueOnce(null);

      const result = await service.getConsolidatedRevenues("user-1", 2026, 5);

      expect(result.fixedRevenues[0]!.previousAmount).toBeNull();
    });

    it("should summarize the 12 months with the same totals as the monthly query", async () => {
      oneTimeRepository.findByUserAndCompetence.mockImplementation(
        (_user: string, _year: number, month: number) =>
          Promise.resolve(month === 2 ? [buildOneTime(300.2, "rev-1")] : []),
      );

      const summary = await service.getYearSummary("user-1", 2026);
      const monthly = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          service.getConsolidatedRevenues("user-1", 2026, i + 1),
        ),
      );

      expect(summary.year).toBe(2026);
      expect(summary.reference).toEqual({ year: 2026, month: 4 });
      expect(summary.months).toHaveLength(12);
      expect(summary.months.map((m) => m.totals)).toEqual(monthly.map((m) => m.totals));
      expect(summary.months[1]!.totals).toEqual({
        oneTimeTotal: 300.2,
        fixedTotal: 5000,
        total: 5300.2,
      });
      expect(summary.months[3]!.competenceStatus).toBe("CURRENT");
    });
  });
});
