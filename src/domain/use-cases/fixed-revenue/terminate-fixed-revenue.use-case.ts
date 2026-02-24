import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";

export interface TerminateFixedRevenueInput {
  id: string;
  userId: string;
  endMonth: number;
  endYear: number;
}

export class TerminateFixedRevenueUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  async execute(input: TerminateFixedRevenueInput): Promise<FixedRevenue> {
    const revenue = await this.repository.findById(input.id);

    if (!revenue || revenue.userId !== input.userId) {
      throw new FixedRevenueNotFoundError(input.id);
    }

    if (revenue.endMonth != null && revenue.endYear != null) {
      const currentEnd = MonthlyCompetence.create(revenue.endMonth, revenue.endYear);
      if (currentEnd.isPastMonth()) {
        throw new AlreadyExpiredError();
      }
    }

    const newEnd = MonthlyCompetence.create(input.endMonth, input.endYear);

    if (newEnd.isPastMonth()) {
      throw new PastTerminationDateError();
    }

    const terminated = revenue.terminate(input.endMonth, input.endYear);

    return this.repository.update(terminated);
  }
}

export class AlreadyExpiredError extends Error {
  constructor() {
    super("Fixed revenue has already expired");
    this.name = "AlreadyExpiredError";
  }
}

export class PastTerminationDateError extends Error {
  constructor() {
    super("Termination date must be current or future month");
    this.name = "PastTerminationDateError";
  }
}
