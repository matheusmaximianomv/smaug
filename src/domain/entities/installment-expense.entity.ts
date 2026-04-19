import { randomUUID } from "crypto";
import { Installment } from "@src/domain/entities/installment.entity";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_DECIMAL_PLACES = 2;
const MIN_INSTALLMENT_COUNT = 1;
const MAX_INSTALLMENT_COUNT = 72;

export interface InstallmentExpenseProps {
  id?: string;
  userId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  installmentCount: number;
  startMonth: number;
  startYear: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type InstallmentExpensePersistenceProps = Required<InstallmentExpenseProps>;

export class InstallmentExpense {
  public readonly id: string;
  public readonly userId: string;
  public readonly categoryId: string;
  public readonly description: string;
  public readonly totalAmount: number;
  public readonly installmentCount: number;
  public readonly startMonth: number;
  public readonly startYear: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: InstallmentExpensePersistenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.categoryId = props.categoryId;
    this.description = props.description;
    this.totalAmount = props.totalAmount;
    this.installmentCount = props.installmentCount;
    this.startMonth = props.startMonth;
    this.startYear = props.startYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: InstallmentExpenseProps): InstallmentExpense {
    const normalizedDescription = InstallmentExpense.normalizeDescription(props.description);
    InstallmentExpense.validateDescription(normalizedDescription);
    InstallmentExpense.validateAmount(props.totalAmount);
    InstallmentExpense.validateInstallmentCount(props.installmentCount);

    const start = MonthlyCompetence.create(props.startMonth, props.startYear);

    const now = new Date();
    return new InstallmentExpense({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      categoryId: props.categoryId,
      description: normalizedDescription,
      totalAmount: props.totalAmount,
      installmentCount: props.installmentCount,
      startMonth: start.month,
      startYear: start.year,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public updateDetails(changes: { description?: string; categoryId?: string }): InstallmentExpense {
    const normalizedDescription = changes.description !== undefined
      ? InstallmentExpense.normalizeDescription(changes.description)
      : this.description;
    if (changes.description !== undefined) {
      InstallmentExpense.validateDescription(normalizedDescription);
    }

    return new InstallmentExpense({
      id: this.id,
      userId: this.userId,
      categoryId: changes.categoryId ?? this.categoryId,
      description: normalizedDescription,
      totalAmount: this.totalAmount,
      installmentCount: this.installmentCount,
      startMonth: this.startMonth,
      startYear: this.startYear,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public getStartCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.startMonth, this.startYear);
  }

  public calculateInstallments(): Installment[] {
    const totalCents = Math.round(this.totalAmount * 100);
    const baseCents = Math.floor(totalCents / this.installmentCount);
    const remainder = totalCents % this.installmentCount;

    const startCompetence = this.getStartCompetence();

    return Array.from({ length: this.installmentCount }, (_, index) => {
      const incremented = InstallmentExpense.addMonths(startCompetence, index);
      const amountCents = baseCents + (index === 0 ? remainder : 0);

      return Installment.create({
        installmentExpenseId: this.id,
        installmentNumber: index + 1,
        amount: amountCents / 100,
        competenceMonth: incremented.month,
        competenceYear: incremented.year,
      });
    });
  }

  private static addMonths(competence: MonthlyCompetence, offset: number): MonthlyCompetence {
    const totalMonths = competence.year * 12 + (competence.month - 1) + offset;
    const year = Math.floor(totalMonths / 12);
    const month = (totalMonths % 12) + 1;
    return MonthlyCompetence.create(month, year);
  }

  private static normalizeDescription(description: string): string {
    return description.trim();
  }

  private static validateDescription(description: string): void {
    if (description.length < MIN_DESCRIPTION_LENGTH || description.length > MAX_DESCRIPTION_LENGTH) {
      throw new Error(
        `Description must be between ${MIN_DESCRIPTION_LENGTH} and ${MAX_DESCRIPTION_LENGTH} characters`,
      );
    }
  }

  private static validateAmount(amount: number): void {
    if (amount <= 0) {
      throw new Error("Total amount must be greater than 0");
    }
    const decimalStr = amount.toString();
    const decimalIndex = decimalStr.indexOf(".");
    if (decimalIndex !== -1 && decimalStr.length - decimalIndex - 1 > MAX_DECIMAL_PLACES) {
      throw new Error(`Total amount must have at most ${MAX_DECIMAL_PLACES} decimal places`);
    }
  }

  private static validateInstallmentCount(installmentCount: number): void {
    if (!Number.isInteger(installmentCount)) {
      throw new Error("Installment count must be an integer");
    }
    if (installmentCount < MIN_INSTALLMENT_COUNT || installmentCount > MAX_INSTALLMENT_COUNT) {
      throw new Error(
        `Installment count must be between ${MIN_INSTALLMENT_COUNT} and ${MAX_INSTALLMENT_COUNT}`,
      );
    }
  }
}
