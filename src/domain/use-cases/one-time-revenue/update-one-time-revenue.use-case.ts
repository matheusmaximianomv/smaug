import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface UpdateOneTimeRevenueInput {
  id: string;
  userId: string;
  description?: string;
  amount?: number;
}

export class UpdateOneTimeRevenueUseCase {
  constructor(private readonly repository: OneTimeRevenueRepository) {}

  async execute(input: UpdateOneTimeRevenueInput): Promise<OneTimeRevenue> {
    const revenue = await this.repository.findById(input.id);

    if (!revenue || revenue.userId !== input.userId) {
      throw new RevenueNotFoundError(input.id);
    }

    const competence = MonthlyCompetence.create(revenue.competenceMonth, revenue.competenceYear);
    if (competence.isPastMonth()) {
      throw new PastCompetenceEditError();
    }

    const updated = revenue.update({
      description: input.description,
      amount: input.amount,
    });

    return this.repository.update(updated);
  }
}

export class RevenueNotFoundError extends Error {
  constructor(id: string) {
    super(`Revenue with id "${id}" not found`);
    this.name = "RevenueNotFoundError";
  }
}

export class PastCompetenceEditError extends Error {
  constructor() {
    super("Cannot edit revenue for a past month");
    this.name = "PastCompetenceEditError";
  }
}
