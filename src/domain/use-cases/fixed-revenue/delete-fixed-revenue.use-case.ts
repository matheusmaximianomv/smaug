import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { DomainError } from "@src/domain/errors/domain-error";

export interface DeleteFixedRevenueInput {
  id: string;
  userId: string;
}

export class DeleteFixedRevenueUseCase {
  constructor(private readonly repository: FixedRevenueRepository) {}

  public async execute(input: DeleteFixedRevenueInput): Promise<void> {
    const revenue = await this.repository.findById(input.id);

    if (!revenue || revenue.userId !== input.userId) {
      throw new FixedRevenueNotFoundError(input.id);
    }

    await this.repository.delete(input.id);
  }
}

export class FixedRevenueNotFoundError extends DomainError {
  public readonly code = "FIXED_REVENUE_NOT_FOUND";

  constructor(id: string) {
    super(`Fixed revenue with id "${id}" not found`);
    this.name = "FixedRevenueNotFoundError";
  }
}
