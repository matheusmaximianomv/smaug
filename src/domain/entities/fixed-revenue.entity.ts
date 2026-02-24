import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export type FixedRevenueModality = "ALTERABLE" | "UNALTERABLE";

export interface FixedRevenueProps {
  id?: string;
  userId: string;
  modality: FixedRevenueModality;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class FixedRevenue {
  public readonly id: string;
  public readonly userId: string;
  public readonly modality: FixedRevenueModality;
  public readonly startMonth: number;
  public readonly startYear: number;
  public readonly endMonth: number | null;
  public readonly endYear: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: {
    id: string;
    userId: string;
    modality: FixedRevenueModality;
    startMonth: number;
    startYear: number;
    endMonth: number | null;
    endYear: number | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = props.id;
    this.userId = props.userId;
    this.modality = props.modality;
    this.startMonth = props.startMonth;
    this.startYear = props.startYear;
    this.endMonth = props.endMonth;
    this.endYear = props.endYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: FixedRevenueProps): FixedRevenue {
    FixedRevenue.validateModality(props.modality);

    const start = MonthlyCompetence.create(props.startMonth, props.startYear);

    let endMonth: number | null = null;
    let endYear: number | null = null;

    if (props.endMonth != null && props.endYear != null) {
      const end = MonthlyCompetence.create(props.endMonth, props.endYear);
      if (end.isBefore(start)) {
        throw new Error("End date must be on or after start date");
      }
      endMonth = end.month;
      endYear = end.year;
    }

    const now = new Date();
    return new FixedRevenue({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      modality: props.modality,
      startMonth: start.month,
      startYear: start.year,
      endMonth,
      endYear,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public terminate(endMonth: number, endYear: number): FixedRevenue {
    const end = MonthlyCompetence.create(endMonth, endYear);
    const start = this.getStartCompetence();
    if (end.isBefore(start)) {
      throw new Error("End date must be on or after start date");
    }
    return new FixedRevenue({
      id: this.id,
      userId: this.userId,
      modality: this.modality,
      startMonth: this.startMonth,
      startYear: this.startYear,
      endMonth: end.month,
      endYear: end.year,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public isActiveForMonth(month: number, year: number): boolean {
    const target = MonthlyCompetence.create(month, year);
    const start = this.getStartCompetence();

    if (target.isBefore(start)) return false;

    if (this.endMonth != null && this.endYear != null) {
      const end = MonthlyCompetence.create(this.endMonth, this.endYear);
      if (target.isAfter(end)) return false;
    }

    return true;
  }

  public getStartCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.startMonth, this.startYear);
  }

  public getEndCompetence(): MonthlyCompetence | null {
    if (this.endMonth == null || this.endYear == null) return null;
    return MonthlyCompetence.create(this.endMonth, this.endYear);
  }

  private static validateModality(modality: string): void {
    if (modality !== "ALTERABLE" && modality !== "UNALTERABLE") {
      throw new Error('Modality must be "ALTERABLE" or "UNALTERABLE"');
    }
  }
}
