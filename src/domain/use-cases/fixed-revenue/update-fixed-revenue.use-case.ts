import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";

export interface UpdateFixedRevenueInput {
  id: string;
  userId: string;
  description: string;
  amount: number;
  effectiveMonth: number;
  effectiveYear: number;
}

export class UpdateFixedRevenueUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  async execute(input: UpdateFixedRevenueInput): Promise<FixedRevenueVersion> {
    const result = await this.repository.findByIdWithVersions(input.id);

    if (!result || result.revenue.userId !== input.userId) {
      throw new FixedRevenueNotFoundError(input.id);
    }

    const { revenue, versions } = result;

    if (revenue.modality !== "ALTERABLE") {
      throw new UnalterableRevenueError();
    }

    const effective = MonthlyCompetence.create(input.effectiveMonth, input.effectiveYear);

    if (effective.isPastMonth()) {
      throw new PastEffectiveDateError();
    }

    const start = revenue.getStartCompetence();
    if (effective.isBefore(start)) {
      throw new EffectiveDateBeforeStartError();
    }

    const end = revenue.getEndCompetence();
    if (end && effective.isAfter(end)) {
      throw new EffectiveDateAfterEndError();
    }

    const duplicateVersion = versions.find(
      (v) => v.effectiveMonth === input.effectiveMonth && v.effectiveYear === input.effectiveYear,
    );
    if (duplicateVersion) {
      throw new VersionConflictError(input.effectiveMonth, input.effectiveYear);
    }

    const newVersion = FixedRevenueVersion.create({
      fixedRevenueId: revenue.id,
      description: input.description,
      amount: input.amount,
      effectiveMonth: input.effectiveMonth,
      effectiveYear: input.effectiveYear,
    });

    return this.repository.addVersion(newVersion);
  }
}

export class UnalterableRevenueError extends Error {
  constructor() {
    super("Cannot update an UNALTERABLE fixed revenue");
    this.name = "UnalterableRevenueError";
  }
}

export class PastEffectiveDateError extends Error {
  constructor() {
    super("Effective date must be current or future month");
    this.name = "PastEffectiveDateError";
  }
}

export class EffectiveDateBeforeStartError extends Error {
  constructor() {
    super("Effective date must be on or after the revenue start date");
    this.name = "EffectiveDateBeforeStartError";
  }
}

export class EffectiveDateAfterEndError extends Error {
  constructor() {
    super("Effective date must be on or before the revenue end date");
    this.name = "EffectiveDateAfterEndError";
  }
}

export class VersionConflictError extends Error {
  constructor(month: number, year: number) {
    super(`A version already exists for ${year}-${String(month).padStart(2, "0")}`);
    this.name = "VersionConflictError";
  }
}
