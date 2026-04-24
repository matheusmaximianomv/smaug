import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";

export interface FixedRevenueRepository {
  findById(id: string): Promise<FixedRevenue | null>;
  findByIdWithVersions(id: string): Promise<{ revenue: FixedRevenue; versions: FixedRevenueVersion[] } | null>;
  findAllByUser(userId: string): Promise<FixedRevenue[]>;
  findActiveForCompetence(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<FixedRevenue[]>;
  create(revenue: FixedRevenue, initialVersion: FixedRevenueVersion): Promise<FixedRevenue>;
  update(revenue: FixedRevenue): Promise<FixedRevenue>;
  delete(id: string): Promise<void>;
  addVersion(version: FixedRevenueVersion): Promise<FixedRevenueVersion>;
  findVersionsForRevenue(fixedRevenueId: string): Promise<FixedRevenueVersion[]>;
  findVersionForMonth(
    fixedRevenueId: string,
    month: number,
    year: number,
  ): Promise<FixedRevenueVersion | null>;
}
