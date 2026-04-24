import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

export interface OneTimeRevenueRepository {
  findById(id: string): Promise<OneTimeRevenue | null>;
  findAllByUser(userId: string): Promise<OneTimeRevenue[]>;
  findByUserAndCompetence(
    userId: string,
    competenceYear: number,
    competenceMonth: number,
  ): Promise<OneTimeRevenue[]>;
  create(revenue: OneTimeRevenue): Promise<OneTimeRevenue>;
  update(revenue: OneTimeRevenue): Promise<OneTimeRevenue>;
  delete(id: string): Promise<void>;
}
