import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  UpdateFixedRevenueUseCase,
  UnalterableRevenueError,
  PastEffectiveDateError,
  EffectiveDateBeforeStartError,
  EffectiveDateAfterEndError,
  VersionConflictError,
} from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { FixedRevenue, FixedRevenueModality } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { createFixedRevenueRepositoryMock } from "../../../../helpers/repository-mocks";

describe("UpdateFixedRevenueUseCase", () => {
  const BASE_DATE = new Date("2026-03-15T00:00:00.000Z");
  const repository = createFixedRevenueRepositoryMock();
  const useCase = new UpdateFixedRevenueUseCase(repository);

  const buildRevenue = (
    overrides: {
      modality?: FixedRevenueModality;
      endMonth?: number | null;
      endYear?: number | null;
    } = {},
  ) =>
    FixedRevenue.create({
      id: "fixed-1",
      userId: "user-1",
      modality: overrides.modality ?? "ALTERABLE",
      startMonth: 2,
      startYear: 2026,
      endMonth: overrides.endMonth ?? null,
      endYear: overrides.endYear ?? null,
    });

  const initialVersion = FixedRevenueVersion.create({
    id: "version-1",
    fixedRevenueId: "fixed-1",
    description: "Salário",
    amount: 8500,
    effectiveMonth: 2,
    effectiveYear: 2026,
  });

  const input = {
    id: "fixed-1",
    userId: "user-1",
    description: "Salário reajustado",
    amount: 9000,
    effectiveMonth: 4,
    effectiveYear: 2026,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
    repository.addVersion.mockImplementation(async (version) => version);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should append a new version", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue(),
      versions: [initialVersion],
    });

    const result = await useCase.execute(input);

    expect(repository.addVersion).toHaveBeenCalledWith(expect.any(FixedRevenueVersion));
    expect(result.description).toBe("Salário reajustado");
    expect(result.amount).toBe(9000);
    expect(result.effectiveMonth).toBe(4);
  });

  it("should append a version when the effective date equals the end competence", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue({ endMonth: 4, endYear: 2026 }),
      versions: [initialVersion],
    });

    const result = await useCase.execute(input);

    expect(result.effectiveMonth).toBe(4);
  });

  it("should throw FixedRevenueNotFoundError when the revenue does not exist", async () => {
    repository.findByIdWithVersions.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toThrow(FixedRevenueNotFoundError);
  });

  it("should throw FixedRevenueNotFoundError when the revenue belongs to another user", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue(),
      versions: [initialVersion],
    });

    await expect(useCase.execute({ ...input, userId: "other-user" })).rejects.toThrow(
      FixedRevenueNotFoundError,
    );
  });

  it("should throw UnalterableRevenueError for an UNALTERABLE revenue", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue({ modality: "UNALTERABLE" }),
      versions: [initialVersion],
    });

    await expect(useCase.execute(input)).rejects.toThrow(UnalterableRevenueError);
  });

  it("should throw PastEffectiveDateError when the effective date is in the past", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue(),
      versions: [initialVersion],
    });

    await expect(useCase.execute({ ...input, effectiveMonth: 2 })).rejects.toThrow(
      PastEffectiveDateError,
    );
  });

  it("should throw EffectiveDateBeforeStartError when the effective date precedes the start", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: FixedRevenue.create({
        id: "fixed-1",
        userId: "user-1",
        modality: "ALTERABLE",
        startMonth: 6,
        startYear: 2026,
      }),
      versions: [],
    });

    await expect(useCase.execute(input)).rejects.toThrow(EffectiveDateBeforeStartError);
  });

  it("should throw EffectiveDateAfterEndError when the effective date exceeds the end", async () => {
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue({ endMonth: 3, endYear: 2026 }),
      versions: [initialVersion],
    });

    await expect(useCase.execute(input)).rejects.toThrow(EffectiveDateAfterEndError);
  });

  it("should throw VersionConflictError when a version already exists for the competence", async () => {
    const conflicting = FixedRevenueVersion.create({
      id: "version-2",
      fixedRevenueId: "fixed-1",
      description: "Salário",
      amount: 8700,
      effectiveMonth: 4,
      effectiveYear: 2026,
    });
    repository.findByIdWithVersions.mockResolvedValue({
      revenue: buildRevenue(),
      versions: [initialVersion, conflicting],
    });

    await expect(useCase.execute(input)).rejects.toThrow(VersionConflictError);
    expect(repository.addVersion).not.toHaveBeenCalled();
  });

  it("should expose the error codes", () => {
    expect(new UnalterableRevenueError()).toMatchObject({
      code: "UNALTERABLE_REVENUE",
      name: "UnalterableRevenueError",
      message: "Cannot update an UNALTERABLE fixed revenue",
    });
    expect(new PastEffectiveDateError()).toMatchObject({
      code: "PAST_EFFECTIVE_DATE",
      name: "PastEffectiveDateError",
      message: "Effective date must be current or future month",
    });
    expect(new EffectiveDateBeforeStartError()).toMatchObject({
      code: "EFFECTIVE_DATE_BEFORE_START",
      name: "EffectiveDateBeforeStartError",
      message: "Effective date must be on or after the revenue start date",
    });
    expect(new EffectiveDateAfterEndError()).toMatchObject({
      code: "EFFECTIVE_DATE_AFTER_END",
      name: "EffectiveDateAfterEndError",
      message: "Effective date must be on or before the revenue end date",
    });
    expect(new VersionConflictError(4, 2026)).toMatchObject({
      code: "VERSION_CONFLICT",
      name: "VersionConflictError",
      message: "A version already exists for 2026-04",
    });
  });
});
