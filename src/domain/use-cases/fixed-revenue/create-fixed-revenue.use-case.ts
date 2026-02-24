import { FixedRevenue, FixedRevenueModality } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface CreateFixedRevenueInput {
  userId: string;
  description: string;
  amount: number;
  modality: FixedRevenueModality;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
}

export class CreateFixedRevenueUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  async execute(input: CreateFixedRevenueInput): Promise<{ revenue: FixedRevenue; version: FixedRevenueVersion }> {
    const start = MonthlyCompetence.create(input.startMonth, input.startYear);

    if (start.isPastMonth()) {
      throw new PastStartDateError();
    }

    const revenue = FixedRevenue.create({
      userId: input.userId,
      modality: input.modality,
      startMonth: input.startMonth,
      startYear: input.startYear,
      endMonth: input.endMonth,
      endYear: input.endYear,
    });

    const initialVersion = FixedRevenueVersion.create({
      fixedRevenueId: revenue.id,
      description: input.description,
      amount: input.amount,
      effectiveMonth: input.startMonth,
      effectiveYear: input.startYear,
    });

    await this.repository.create(revenue, initialVersion);

    return { revenue, version: initialVersion };
  }
}

export class PastStartDateError extends Error {
  constructor() {
    super("Start date must be current or future month");
    this.name = "PastStartDateError";
  }
}
