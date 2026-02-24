import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

export interface OneTimeRevenueProps {
  id?: string;
  userId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class OneTimeRevenue {
  readonly id: string;
  readonly userId: string;
  readonly description: string;
  readonly amount: number;
  readonly competenceMonth: number;
  readonly competenceYear: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: Required<OneTimeRevenueProps>) {
    this.id = props.id;
    this.userId = props.userId;
    this.description = props.description;
    this.amount = props.amount;
    this.competenceMonth = props.competenceMonth;
    this.competenceYear = props.competenceYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: OneTimeRevenueProps): OneTimeRevenue {
    const description = props.description.trim();
    OneTimeRevenue.validateDescription(description);
    OneTimeRevenue.validateAmount(props.amount);

    const competence = MonthlyCompetence.create(props.competenceMonth, props.competenceYear);

    const now = new Date();
    return new OneTimeRevenue({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      description,
      amount: props.amount,
      competenceMonth: competence.month,
      competenceYear: competence.year,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  update(changes: { description?: string; amount?: number }): OneTimeRevenue {
    const newDescription = changes.description !== undefined
      ? changes.description.trim()
      : this.description;
    const newAmount = changes.amount !== undefined ? changes.amount : this.amount;

    if (changes.description !== undefined) {
      OneTimeRevenue.validateDescription(newDescription);
    }
    if (changes.amount !== undefined) {
      OneTimeRevenue.validateAmount(newAmount);
    }

    return new OneTimeRevenue({
      id: this.id,
      userId: this.userId,
      description: newDescription,
      amount: newAmount,
      competenceMonth: this.competenceMonth,
      competenceYear: this.competenceYear,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  getCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.competenceMonth, this.competenceYear);
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
