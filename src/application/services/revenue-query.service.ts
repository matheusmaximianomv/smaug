import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import { OneTimeRevenueResponseDto } from "@src/application/dtos/one-time-revenue.dto";
import { ConsolidatedRevenueResponseDto, FixedRevenueWithVersionDto } from "@src/application/dtos/revenue-query.dto";

const CENTS_MULTIPLIER = 100;

export class RevenueQueryService {
  constructor(
    private readonly oneTimeRevenueRepository: OneTimeRevenueRepository,
    private readonly fixedRevenueRepository: FixedRevenueRepository,
  ) {}

  public async getConsolidatedRevenues(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<ConsolidatedRevenueResponseDto> {
    const [oneTimeRevenues, activeFixedRevenues] = await Promise.all([
      this.oneTimeRevenueRepository.findByUserAndCompetence(userId, competenceYear, competenceMonth),
      this.fixedRevenueRepository.findActiveForCompetence(userId, competenceYear, competenceMonth),
    ]);

    const oneTimeDtos: OneTimeRevenueResponseDto[] = oneTimeRevenues.map(
      OneTimeRevenueService.toResponseDto,
    );

    const fixedDtos: FixedRevenueWithVersionDto[] = [];

    for (const revenue of activeFixedRevenues) {
      const version = await this.fixedRevenueRepository.findVersionForMonth(
        revenue.id,
        competenceMonth,
        competenceYear,
      );

      if (version) {
        fixedDtos.push({
          ...FixedRevenueService.toResponseDto(revenue),
          currentVersion: FixedRevenueService.toVersionResponseDto(version),
        });
      }
    }

    const oneTimeTotal = oneTimeRevenues.reduce((sum, r) => sum + r.amount, 0);
    const fixedTotal = fixedDtos.reduce((sum, r) => sum + r.currentVersion.amount, 0);
    const total = Math.round((oneTimeTotal + fixedTotal) * CENTS_MULTIPLIER) / CENTS_MULTIPLIER;

    return {
      competenceYear,
      competenceMonth,
      oneTimeRevenues: oneTimeDtos,
      fixedRevenues: fixedDtos,
      totals: {
        oneTimeTotal: Math.round(oneTimeTotal * CENTS_MULTIPLIER) / CENTS_MULTIPLIER,
        fixedTotal: Math.round(fixedTotal * CENTS_MULTIPLIER) / CENTS_MULTIPLIER,
        total,
      },
    };
  }
}
