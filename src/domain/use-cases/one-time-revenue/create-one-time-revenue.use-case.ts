import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { DomainError } from "@src/domain/errors/domain-error";

export interface CreateOneTimeRevenueInput {
  userId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
}

export class CreateOneTimeRevenueUseCase {
  constructor(private readonly repository: OneTimeRevenueRepository) {}

  public async execute(input: CreateOneTimeRevenueInput): Promise<OneTimeRevenue> {
    const competence = MonthlyCompetence.create(input.competenceMonth, input.competenceYear);

    if (competence.isPastMonth()) {
      throw new PastCompetenceError();
    }

    const revenue = OneTimeRevenue.create({
      userId: input.userId,
      description: input.description,
      amount: input.amount,
      competenceMonth: input.competenceMonth,
      competenceYear: input.competenceYear,
    });

    return this.repository.create(revenue);
  }
}

export class PastCompetenceError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  constructor() {
    super("Cannot create revenue for a past month");
    this.name = "PastCompetenceError";
  }
}
