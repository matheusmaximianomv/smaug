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
  readonly id: string;
  readonly userId: string;
  readonly modality: FixedRevenueModality;
  readonly startMonth: number;
  readonly startYear: number;
  readonly endMonth: number | null;
  readonly endYear: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

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

  static create(props: FixedRevenueProps): FixedRevenue {
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

  terminate(endMonth: number, endYear: number): FixedRevenue {
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

  isActiveForMonth(month: number, year: number): boolean {
    const target = MonthlyCompetence.create(month, year);
    const start = this.getStartCompetence();

    if (target.isBefore(start)) return false;

    if (this.endMonth != null && this.endYear != null) {
      const end = MonthlyCompetence.create(this.endMonth, this.endYear);
      if (target.isAfter(end)) return false;
    }

    return true;
  }

  getStartCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.startMonth, this.startYear);
  }

  getEndCompetence(): MonthlyCompetence | null {
    if (this.endMonth == null || this.endYear == null) return null;
    return MonthlyCompetence.create(this.endMonth, this.endYear);
  }

  private static validateModality(modality: string): void {
    if (modality !== "ALTERABLE" && modality !== "UNALTERABLE") {
      throw new Error('Modality must be "ALTERABLE" or "UNALTERABLE"');
    }
  }
}
