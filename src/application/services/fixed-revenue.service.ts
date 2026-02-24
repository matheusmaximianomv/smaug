import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { CreateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import { DeleteFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { GetFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/get-fixed-revenue.use-case";
import { ListFixedRevenuesUseCase } from "@src/domain/use-cases/fixed-revenue/list-fixed-revenues.use-case";
import { UpdateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import { TerminateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";
import {
  FixedRevenueResponseDto,
  FixedRevenueVersionResponseDto,
} from "@src/application/dtos/fixed-revenue.dto";
import { FixedRevenueModality } from "@src/domain/entities/fixed-revenue.entity";

export class FixedRevenueService {
  constructor(
    private readonly createUseCase: CreateFixedRevenueUseCase,
    private readonly deleteUseCase: DeleteFixedRevenueUseCase,
    private readonly getUseCase: GetFixedRevenueUseCase,
    private readonly listUseCase: ListFixedRevenuesUseCase,
    private readonly updateUseCase?: UpdateFixedRevenueUseCase,
    private readonly terminateUseCase?: TerminateFixedRevenueUseCase,
  ) {}

  async create(
    userId: string,
    input: {
      description: string;
      amount: number;
      modality: FixedRevenueModality;
      startMonth: number;
      startYear: number;
      endMonth?: number | null;
      endYear?: number | null;
    },
  ): Promise<FixedRevenueResponseDto> {
    const { revenue, version } = await this.createUseCase.execute({ userId, ...input });
    return FixedRevenueService.toResponseDto(revenue, [version]);
  }

  async getById(userId: string, id: string): Promise<FixedRevenueResponseDto> {
    const { revenue, versions } = await this.getUseCase.execute({ id, userId });
    return FixedRevenueService.toResponseDto(revenue, versions);
  }

  async update(
    userId: string,
    id: string,
    input: { description: string; amount: number; effectiveMonth: number; effectiveYear: number },
  ): Promise<FixedRevenueVersionResponseDto> {
    if (!this.updateUseCase) throw new Error("UpdateFixedRevenueUseCase not registered");
    const version = await this.updateUseCase.execute({ id, userId, ...input });
    return FixedRevenueService.toVersionResponseDto(version);
  }

  async terminate(
    userId: string,
    id: string,
    input: { endMonth: number; endYear: number },
  ): Promise<FixedRevenueResponseDto> {
    if (!this.terminateUseCase) throw new Error("TerminateFixedRevenueUseCase not registered");
    const revenue = await this.terminateUseCase.execute({ id, userId, ...input });
    return FixedRevenueService.toResponseDto(revenue);
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  async list(
    userId: string,
    filters?: { competenceYear?: number; competenceMonth?: number },
  ): Promise<FixedRevenueResponseDto[]> {
    const revenues = await this.listUseCase.execute({
      userId,
      competenceYear: filters?.competenceYear,
      competenceMonth: filters?.competenceMonth,
    });
    return revenues.map((r) => FixedRevenueService.toResponseDto(r));
  }

  static toResponseDto(revenue: FixedRevenue, versions?: FixedRevenueVersion[]): FixedRevenueResponseDto {
    const dto: FixedRevenueResponseDto = {
      id: revenue.id,
      userId: revenue.userId,
      modality: revenue.modality,
      startMonth: revenue.startMonth,
      startYear: revenue.startYear,
      endMonth: revenue.endMonth,
      endYear: revenue.endYear,
      createdAt: revenue.createdAt.toISOString(),
      updatedAt: revenue.updatedAt.toISOString(),
    };
    if (versions) {
      dto.versions = versions.map(FixedRevenueService.toVersionResponseDto);
    }
    return dto;
  }

  static toVersionResponseDto(version: FixedRevenueVersion): FixedRevenueVersionResponseDto {
    return {
      id: version.id,
      fixedRevenueId: version.fixedRevenueId,
      description: version.description,
      amount: version.amount,
      effectiveMonth: version.effectiveMonth,
      effectiveYear: version.effectiveYear,
      createdAt: version.createdAt.toISOString(),
    };
  }
}
