import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { CreateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import { UpdateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import { DeleteOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/delete-one-time-revenue.use-case";
import { ListOneTimeRevenuesUseCase } from "@src/domain/use-cases/one-time-revenue/list-one-time-revenues.use-case";
import { OneTimeRevenueResponseDto } from "@src/application/dtos/one-time-revenue.dto";

export class OneTimeRevenueService {
  constructor(
    private readonly createUseCase: CreateOneTimeRevenueUseCase,
    private readonly updateUseCase: UpdateOneTimeRevenueUseCase,
    private readonly deleteUseCase: DeleteOneTimeRevenueUseCase,
    private readonly listUseCase: ListOneTimeRevenuesUseCase,
  ) {}

  async create(
    userId: string,
    input: { description: string; amount: number; competenceMonth: number; competenceYear: number },
  ): Promise<OneTimeRevenueResponseDto> {
    const revenue = await this.createUseCase.execute({ userId, ...input });
    return OneTimeRevenueService.toResponseDto(revenue);
  }

  async update(
    userId: string,
    id: string,
    input: { description?: string; amount?: number },
  ): Promise<OneTimeRevenueResponseDto> {
    const revenue = await this.updateUseCase.execute({ id, userId, ...input });
    return OneTimeRevenueService.toResponseDto(revenue);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  async list(
    userId: string,
    filters?: { competenceYear?: number; competenceMonth?: number },
  ): Promise<OneTimeRevenueResponseDto[]> {
    const revenues = await this.listUseCase.execute({
      userId,
      competenceYear: filters?.competenceYear,
      competenceMonth: filters?.competenceMonth,
    });
    return revenues.map(OneTimeRevenueService.toResponseDto);
  }

  static toResponseDto(revenue: OneTimeRevenue): OneTimeRevenueResponseDto {
    return {
      id: revenue.id,
      userId: revenue.userId,
      description: revenue.description,
      amount: revenue.amount,
      competenceYear: revenue.competenceYear,
      competenceMonth: revenue.competenceMonth,
      createdAt: revenue.createdAt.toISOString(),
      updatedAt: revenue.updatedAt.toISOString(),
    };
  }
}
