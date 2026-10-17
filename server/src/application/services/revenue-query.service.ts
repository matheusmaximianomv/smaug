import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import { OneTimeRevenueResponseDto } from "@src/application/dtos/one-time-revenue.dto";
import {
  ConsolidatedRevenueResponseDto,
  FixedRevenueWithVersionDto,
  RevenueYearSummaryResponseDto,
} from "@src/application/dtos/revenue-query.dto";
import { toReferenceDto } from "@src/application/dtos/competence.dto";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

const CENTS_MULTIPLIER = 100;
const MONTHS_IN_YEAR = 12;

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
      this.oneTimeRevenueRepository.findByUserAndCompetence(
        userId,
        competenceYear,
        competenceMonth,
      ),
      this.fixedRevenueRepository.findActiveForCompetence(userId, competenceYear, competenceMonth),
    ]);

    const oneTimeDtos: OneTimeRevenueResponseDto[] = oneTimeRevenues.map(
      OneTimeRevenueService.toResponseDto,
    );

    const competence = MonthlyCompetence.create(competenceMonth, competenceYear);
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
          previousAmount: await this.loadPreviousAmount(revenue, version, competence),
        });
      }
    }

    const oneTimeTotal = oneTimeRevenues.reduce((sum, r) => sum + r.amount, 0);
    const fixedTotal = fixedDtos.reduce((sum, r) => sum + r.currentVersion.amount, 0);
    const total = Math.round((oneTimeTotal + fixedTotal) * CENTS_MULTIPLIER) / CENTS_MULTIPLIER;

    return {
      competenceYear,
      competenceMonth,
      competenceStatus: competence.statusAt(),
      reference: toReferenceDto(MonthlyCompetence.current()),
      oneTimeRevenues: oneTimeDtos,
      fixedRevenues: fixedDtos,
      totals: {
        oneTimeTotal: Math.round(oneTimeTotal * CENTS_MULTIPLIER) / CENTS_MULTIPLIER,
        fixedTotal: Math.round(fixedTotal * CENTS_MULTIPLIER) / CENTS_MULTIPLIER,
        total,
      },
    };
  }

  /**
   * Reaproveita a consulta mensal para os 12 meses (mesmo padrão do
   * `DataExportService`): a faixa anual soma igual à tela e ao Dashboard por construção.
   */
  public async getYearSummary(
    userId: string,
    year: number,
  ): Promise<RevenueYearSummaryResponseDto> {
    const months = await Promise.all(
      Array.from({ length: MONTHS_IN_YEAR }, (_, index) =>
        this.getConsolidatedRevenues(userId, year, index + 1),
      ),
    );

    return {
      year,
      reference: toReferenceDto(MonthlyCompetence.current()),
      months: months.map((month) => ({
        month: month.competenceMonth,
        competenceStatus: month.competenceStatus,
        totals: month.totals,
      })),
    };
  }

  /**
   * Só busca a versão anterior no mês em que a vigente começa e quando esse mês
   * é posterior ao início da receita — a primeira versão nasce no início.
   */
  private async loadPreviousAmount(
    revenue: FixedRevenue,
    version: FixedRevenueVersion,
    competence: MonthlyCompetence,
  ): Promise<number | null> {
    const startsNow = version.getEffectiveCompetence().equals(competence);
    if (!startsNow || !competence.isAfter(revenue.getStartCompetence())) {
      return null;
    }
    const previousMonth = MonthlyCompetence.addMonths(competence, -1);
    const previous = await this.fixedRevenueRepository.findVersionForMonth(
      revenue.id,
      previousMonth.month,
      previousMonth.year,
    );
    return previous?.amount ?? null;
  }
}
