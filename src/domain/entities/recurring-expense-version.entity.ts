import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { PastEffectiveDateError } from "@src/domain/errors/domain-error";

const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_DECIMAL_PLACES = 2;

export interface RecurringExpenseVersionProps {
  id?: string;
  recurringExpenseId: string;
  categoryId: string;
  description: string;
  amount: number;
  effectiveMonth: number;
  effectiveYear: number;
  createdAt?: Date;
}

type RecurringExpenseVersionPersistenceProps = Required<RecurringExpenseVersionProps>;

export class RecurringExpenseVersion {
  public readonly id: string;
  public readonly recurringExpenseId: string;
  public readonly categoryId: string;
  public readonly description: string;
  public readonly amount: number;
  public readonly effectiveMonth: number;
  public readonly effectiveYear: number;
  public readonly createdAt: Date;

  private constructor(props: RecurringExpenseVersionPersistenceProps) {
    this.id = props.id;
    this.recurringExpenseId = props.recurringExpenseId;
    this.categoryId = props.categoryId;
    this.description = props.description;
    this.amount = props.amount;
    this.effectiveMonth = props.effectiveMonth;
    this.effectiveYear = props.effectiveYear;
    this.createdAt = props.createdAt;
  }

  public static create(props: RecurringExpenseVersionProps): RecurringExpenseVersion {
    const normalizedDescription = RecurringExpenseVersion.normalizeDescription(props.description);
    RecurringExpenseVersion.validateDescription(normalizedDescription);
    RecurringExpenseVersion.validateAmount(props.amount);

    const effective = MonthlyCompetence.create(props.effectiveMonth, props.effectiveYear);
    if (effective.isPastMonth()) {
      throw new PastEffectiveDateError();
    }

    return new RecurringExpenseVersion({
      id: props.id ?? randomUUID(),
      recurringExpenseId: props.recurringExpenseId,
      categoryId: props.categoryId,
      description: normalizedDescription,
      amount: props.amount,
      effectiveMonth: effective.month,
      effectiveYear: effective.year,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  public static rehydrate(props: RecurringExpenseVersionPersistenceProps): RecurringExpenseVersion {
    return new RecurringExpenseVersion(props);
  }

  public getEffectiveCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.effectiveMonth, this.effectiveYear);
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
      throw new Error("Amount must be greater than 0");
    }

    const decimalStr = amount.toString();
    const decimalIndex = decimalStr.indexOf(".");
    if (decimalIndex !== -1 && decimalStr.length - decimalIndex - 1 > MAX_DECIMAL_PLACES) {
      throw new Error(`Amount must have at most ${MAX_DECIMAL_PLACES} decimal places`);
    }
  }
}
