import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { RevenueNotFoundError, PastCompetenceEditError } from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";

export interface DeleteOneTimeRevenueInput {
  id: string;
  userId: string;
}

export class DeleteOneTimeRevenueUseCase {
  constructor(private readonly repository: OneTimeRevenueRepository) {}

  async execute(input: DeleteOneTimeRevenueInput): Promise<void> {
    const revenue = await this.repository.findById(input.id);

    if (!revenue || revenue.userId !== input.userId) {
      throw new RevenueNotFoundError(input.id);
    }

    const competence = MonthlyCompetence.create(revenue.competenceMonth, revenue.competenceYear);
    if (competence.isPastMonth()) {
      throw new PastCompetenceEditError();
    }

    await this.repository.delete(input.id);
  }
}
