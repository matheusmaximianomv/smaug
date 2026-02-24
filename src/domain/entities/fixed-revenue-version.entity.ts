import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface FixedRevenueVersionProps {
  id?: string;
  fixedRevenueId: string;
  description: string;
  amount: number;
  effectiveMonth: number;
  effectiveYear: number;
  createdAt?: Date;
}

export class FixedRevenueVersion {
  readonly id: string;
  readonly fixedRevenueId: string;
  readonly description: string;
  readonly amount: number;
  readonly effectiveMonth: number;
  readonly effectiveYear: number;
  readonly createdAt: Date;

  private constructor(props: Required<FixedRevenueVersionProps>) {
    this.id = props.id;
    this.fixedRevenueId = props.fixedRevenueId;
    this.description = props.description;
    this.amount = props.amount;
    this.effectiveMonth = props.effectiveMonth;
    this.effectiveYear = props.effectiveYear;
    this.createdAt = props.createdAt;
  }

  static create(props: FixedRevenueVersionProps): FixedRevenueVersion {
    const description = props.description.trim();
    FixedRevenueVersion.validateDescription(description);
    FixedRevenueVersion.validateAmount(props.amount);

    const effective = MonthlyCompetence.create(props.effectiveMonth, props.effectiveYear);

    return new FixedRevenueVersion({
      id: props.id ?? randomUUID(),
      fixedRevenueId: props.fixedRevenueId,
      description,
      amount: props.amount,
      effectiveMonth: effective.month,
      effectiveYear: effective.year,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  getEffectiveCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.effectiveMonth, this.effectiveYear);
  }

  private static validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }
    const decimalStr = amount.toString();
    const decimalIndex = decimalStr.indexOf(".");
    if (decimalIndex !== -1 && decimalStr.length - decimalIndex - 1 > 2) {
      throw new Error("Amount must have at most 2 decimal places");
    }
  }

  private static validateDescription(description: string): void {
    if (description.length < 1 || description.length > 255) {
      throw new Error("Description must be between 1 and 255 characters");
    }
  }
}
