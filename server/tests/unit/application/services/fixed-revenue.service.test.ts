import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import type { CreateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import type { DeleteFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import type { GetFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/get-fixed-revenue.use-case";
import type { ListFixedRevenuesUseCase } from "@src/domain/use-cases/fixed-revenue/list-fixed-revenues.use-case";
import type { UpdateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import type { TerminateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";
import type { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { createFixedRevenueRepositoryMock } from "../../../helpers/repository-mocks";

const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");

describe("FixedRevenueService", () => {
  const repository = createFixedRevenueRepositoryMock();
  const createUseCase = { execute: vi.fn() };
  const deleteUseCase = { execute: vi.fn() };
  const getUseCase = { execute: vi.fn() };
  const listUseCase = { execute: vi.fn() };
  const updateUseCase = { execute: vi.fn() };
  const terminateUseCase = { execute: vi.fn() };

  const buildService = (withOptionalUseCases = true) =>
    new FixedRevenueService(
      repository as unknown as FixedRevenueRepository,
      createUseCase as unknown as CreateFixedRevenueUseCase,
      deleteUseCase as unknown as DeleteFixedRevenueUseCase,
      getUseCase as unknown as GetFixedRevenueUseCase,
      listUseCase as unknown as ListFixedRevenuesUseCase,
      withOptionalUseCases ? (updateUseCase as unknown as UpdateFixedRevenueUseCase) : undefined,
      withOptionalUseCases
        ? (terminateUseCase as unknown as TerminateFixedRevenueUseCase)
        : undefined,
    );

  const revenue = FixedRevenue.create({
    id: "fixed-1",
    userId: "user-1",
    modality: "ALTERABLE",
    startMonth: 1,
    startYear: 2026,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  });

  const buildVersion = (month: number, year: number, amount = 8500) =>
    FixedRevenueVersion.create({
      id: `version-${year}-${month}`,
      fixedRevenueId: "fixed-1",
      description: "Salário",
      amount,
      effectiveMonth: month,
      effectiveYear: year,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create a revenue and expose its initial version", async () => {
    const version = buildVersion(1, 2026);
    createUseCase.execute.mockResolvedValue({ revenue, version });

    const result = await buildService().create("user-1", {
      description: "Salário",
      amount: 8500,
      modality: "ALTERABLE",
      startMonth: 1,
      startYear: 2026,
    });

    expect(result.id).toBe("fixed-1");
    expect(result.endMonth).toBeNull();
    expect(result.createdAt).toBe("2026-01-01T00:00:00.000Z");
    expect(result.versions).toHaveLength(1);
    expect(result.currentVersion?.id).toBe("version-2026-1");
  });

  it("should return the version in effect for the current month", async () => {
    getUseCase.execute.mockResolvedValue({
      revenue,
      versions: [buildVersion(6, 2026, 9000), buildVersion(1, 2026, 8500)],
    });

    const result = await buildService().getById("user-1", "fixed-1");

    expect(result.versions?.map((v) => v.effectiveMonth)).toEqual([1, 6]);
    expect(result.currentVersion?.amount).toBe(8500);
  });

  it("should fall back to the earliest version when none is in effect yet", async () => {
    getUseCase.execute.mockResolvedValue({
      revenue,
      versions: [buildVersion(9, 2026, 9500), buildVersion(6, 2026, 9000)],
    });

    const result = await buildService().getById("user-1", "fixed-1");

    expect(result.currentVersion?.effectiveMonth).toBe(6);
  });

  it("should omit version fields when there are no versions", async () => {
    getUseCase.execute.mockResolvedValue({ revenue, versions: [] });

    const result = await buildService().getById("user-1", "fixed-1");

    expect(result.versions).toEqual([]);
    expect(result.currentVersion).toBeUndefined();
  });

  it("should append a version through the update use case", async () => {
    updateUseCase.execute.mockResolvedValue(buildVersion(6, 2026, 9000));

    const result = await buildService().update("user-1", "fixed-1", {
      description: "Salário",
      amount: 9000,
      effectiveMonth: 6,
      effectiveYear: 2026,
    });

    expect(updateUseCase.execute).toHaveBeenCalledWith({
      id: "fixed-1",
      userId: "user-1",
      description: "Salário",
      amount: 9000,
      effectiveMonth: 6,
      effectiveYear: 2026,
    });
    expect(result.amount).toBe(9000);
  });

  it("should terminate through the terminate use case", async () => {
    terminateUseCase.execute.mockResolvedValue(revenue.terminate(8, 2026));

    const result = await buildService().terminate("user-1", "fixed-1", {
      endMonth: 8,
      endYear: 2026,
    });

    expect(result.endMonth).toBe(8);
    expect(result.versions).toBeUndefined();
  });

  it("should fail when the update use case is not registered", async () => {
    await expect(
      buildService(false).update("user-1", "fixed-1", {
        description: "Salário",
        amount: 9000,
        effectiveMonth: 6,
        effectiveYear: 2026,
      }),
    ).rejects.toThrow("UpdateFixedRevenueUseCase not registered");
  });

  it("should fail when the terminate use case is not registered", async () => {
    await expect(
      buildService(false).terminate("user-1", "fixed-1", { endMonth: 8, endYear: 2026 }),
    ).rejects.toThrow("TerminateFixedRevenueUseCase not registered");
  });

  it("should delegate deletion", async () => {
    await buildService().delete("user-1", "fixed-1");

    expect(deleteUseCase.execute).toHaveBeenCalledWith({ id: "fixed-1", userId: "user-1" });
  });

  it("should list revenues with their versions", async () => {
    listUseCase.execute.mockResolvedValue([revenue]);
    repository.findVersionsForRevenue.mockResolvedValue([buildVersion(1, 2026)]);

    const result = await buildService().list("user-1", {
      competenceYear: 2026,
      competenceMonth: 3,
    });

    expect(listUseCase.execute).toHaveBeenCalledWith({
      userId: "user-1",
      competenceYear: 2026,
      competenceMonth: 3,
    });
    expect(result).toHaveLength(1);
    expect(result[0].versions).toHaveLength(1);
  });

  it("should short-circuit when there are no revenues", async () => {
    listUseCase.execute.mockResolvedValue([]);

    const result = await buildService().list("user-1");

    expect(listUseCase.execute).toHaveBeenCalledWith({
      userId: "user-1",
      competenceYear: undefined,
      competenceMonth: undefined,
    });
    expect(result).toEqual([]);
    expect(repository.findVersionsForRevenue).not.toHaveBeenCalled();
  });
});
