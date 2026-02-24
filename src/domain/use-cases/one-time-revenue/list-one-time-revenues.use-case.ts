import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";

export interface ListOneTimeRevenuesInput {
  userId: string;
  competenceYear?: number;
  competenceMonth?: number;
}

export class ListOneTimeRevenuesUseCase {
  constructor(private readonly repository: OneTimeRevenueRepository) {}

  async execute(input: ListOneTimeRevenuesInput): Promise<OneTimeRevenue[]> {
    if (input.competenceYear !== undefined && input.competenceMonth !== undefined) {
      return this.repository.findByUserAndCompetence(
        input.userId,
        input.competenceYear,
        input.competenceMonth,
      );
    }
    return this.repository.findAllByUser(input.userId);
  }
}
