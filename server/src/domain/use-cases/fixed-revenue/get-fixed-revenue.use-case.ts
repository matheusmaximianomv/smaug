import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { FixedRevenueNotFoundError } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";

export interface GetFixedRevenueInput {
  id: string;
  userId: string;
}

export class GetFixedRevenueUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  public async execute(input: GetFixedRevenueInput): Promise<{ revenue: FixedRevenue; versions: FixedRevenueVersion[] }> {
    const result = await this.repository.findByIdWithVersions(input.id);

    if (!result || result.revenue.userId !== input.userId) {
      throw new FixedRevenueNotFoundError(input.id);
    }

    return result;
  }
}
