import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";

export interface ListFixedRevenuesInput {
  userId: string;
  competenceYear?: number;
  competenceMonth?: number;
}

export class ListFixedRevenuesUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  public async execute(input: ListFixedRevenuesInput): Promise<FixedRevenue[]> {
    if (input.competenceYear !== undefined && input.competenceMonth !== undefined) {
      return this.repository.findActiveForCompetence(
        input.userId,
        input.competenceYear,
        input.competenceMonth,
      );
    }
    return this.repository.findAllByUser(input.userId);
  }
}
