import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
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

const MONTHS_IN_YEAR = 12;

export class FixedRevenueService {
  constructor(
    private readonly repository: FixedRevenueRepository,
    private readonly createUseCase: CreateFixedRevenueUseCase,
    private readonly deleteUseCase: DeleteFixedRevenueUseCase,
    private readonly getUseCase: GetFixedRevenueUseCase,
    private readonly listUseCase: ListFixedRevenuesUseCase,
    private readonly updateUseCase?: UpdateFixedRevenueUseCase,
    private readonly terminateUseCase?: TerminateFixedRevenueUseCase,
  ) {}

  public async create(
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

  public async getById(userId: string, id: string): Promise<FixedRevenueResponseDto> {
    const { revenue, versions } = await this.getUseCase.execute({ id, userId });
    return FixedRevenueService.toResponseDto(revenue, versions);
  }

  public async update(
    userId: string,
    id: string,
    input: { description: string; amount: number; effectiveMonth: number; effectiveYear: number },
  ): Promise<FixedRevenueVersionResponseDto> {
    if (!this.updateUseCase) throw new Error("UpdateFixedRevenueUseCase not registered");
    const version = await this.updateUseCase.execute({ id, userId, ...input });
    return FixedRevenueService.toVersionResponseDto(version);
  }

  public async terminate(
    userId: string,
    id: string,
    input: { endMonth: number; endYear: number },
  ): Promise<FixedRevenueResponseDto> {
    if (!this.terminateUseCase) throw new Error("TerminateFixedRevenueUseCase not registered");
    const revenue = await this.terminateUseCase.execute({ id, userId, ...input });
    return FixedRevenueService.toResponseDto(revenue);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  public async list(
    userId: string,
    filters?: { competenceYear?: number; competenceMonth?: number },
  ): Promise<FixedRevenueResponseDto[]> {
    const revenues = await this.listUseCase.execute({
      userId,
      competenceYear: filters?.competenceYear,
      competenceMonth: filters?.competenceMonth,
    });

    if (revenues.length === 0) {
      return [];
    }

    const versionsByRevenue = await Promise.all(
      revenues.map((revenue) => this.repository.findVersionsForRevenue(revenue.id)),
    );

    return revenues.map((revenue, index) =>
      FixedRevenueService.toResponseDto(revenue, versionsByRevenue[index]),
    );
  }

  public static toResponseDto(revenue: FixedRevenue, versions?: FixedRevenueVersion[]): FixedRevenueResponseDto {
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
      const sorted = FixedRevenueService.sortVersions(versions);
      dto.versions = sorted.map(FixedRevenueService.toVersionResponseDto);

      const active = FixedRevenueService.resolveActiveVersion(sorted);
      if (active) {
        dto.currentVersion = FixedRevenueService.toVersionResponseDto(active);
      }
    }
    return dto;
  }

  private static sortVersions(versions: FixedRevenueVersion[]): FixedRevenueVersion[] {
    return [...versions].sort(
      (a, b) =>
        a.effectiveYear * MONTHS_IN_YEAR +
        a.effectiveMonth -
        (b.effectiveYear * MONTHS_IN_YEAR + b.effectiveMonth),
    );
  }

  /**
   * Versão em vigor no mês corrente: a última cujo início é anterior ou igual a hoje.
   * Quando a vigência ainda não começou, devolve a primeira versão, para que a receita
   * seja exibível antes de entrar em vigor.
   */
  private static resolveActiveVersion(
    sortedVersions: FixedRevenueVersion[],
  ): FixedRevenueVersion | undefined {
    if (sortedVersions.length === 0) {
      return undefined;
    }

    const now = new Date();
    const currentCompetence = MonthlyCompetence.create(now.getMonth() + 1, now.getFullYear());

    const inEffect = sortedVersions.filter((version) =>
      MonthlyCompetence.create(version.effectiveMonth, version.effectiveYear).isBeforeOrEqual(
        currentCompetence,
      ),
    );

    return inEffect.at(-1) ?? sortedVersions[0];
  }

  public static toVersionResponseDto(version: FixedRevenueVersion): FixedRevenueVersionResponseDto {
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
