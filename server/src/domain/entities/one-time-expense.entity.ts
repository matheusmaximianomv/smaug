import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

const MIN_DESCRIPTION_LENGTH = 1;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_DECIMAL_PLACES = 2;

export interface OneTimeExpenseProps {
  id?: string;
  userId: string;
  categoryId: string;
  description: string;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type OneTimeExpensePersistenceProps = Required<OneTimeExpenseProps>;

export class OneTimeExpense {
  public readonly id: string;
  public readonly userId: string;
  public readonly categoryId: string;
  public readonly description: string;
  public readonly amount: number;
  public readonly competenceMonth: number;
  public readonly competenceYear: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: OneTimeExpensePersistenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.categoryId = props.categoryId;
    this.description = props.description;
    this.amount = props.amount;
    this.competenceMonth = props.competenceMonth;
    this.competenceYear = props.competenceYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: OneTimeExpenseProps): OneTimeExpense {
    const description = OneTimeExpense.normalizeDescription(props.description);
    OneTimeExpense.validateDescription(description);
    OneTimeExpense.validateAmount(props.amount);

    const competence = MonthlyCompetence.create(props.competenceMonth, props.competenceYear);

    const now = new Date();
    return new OneTimeExpense({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      categoryId: props.categoryId,
      description,
      amount: props.amount,
      competenceMonth: competence.month,
      competenceYear: competence.year,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public update(changes: {
    categoryId?: string;
    description?: string;
    amount?: number;
    competenceMonth?: number;
    competenceYear?: number;
  }): OneTimeExpense {
    const newDescription = changes.description !== undefined
      ? changes.description.trim()
      : this.description;
    if (changes.description !== undefined) {
      OneTimeExpense.validateDescription(newDescription);
    }

    const newAmount = changes.amount !== undefined ? changes.amount : this.amount;
    if (changes.amount !== undefined) {
      OneTimeExpense.validateAmount(newAmount);
    }

    const updatedCompetenceMonth = changes.competenceMonth ?? this.competenceMonth;
    const updatedCompetenceYear = changes.competenceYear ?? this.competenceYear;
    const competence = MonthlyCompetence.create(updatedCompetenceMonth, updatedCompetenceYear);

    return new OneTimeExpense({
      id: this.id,
      userId: this.userId,
      categoryId: changes.categoryId ?? this.categoryId,
      description: newDescription,
      amount: newAmount,
      competenceMonth: competence.month,
      competenceYear: competence.year,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public getCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.competenceMonth, this.competenceYear);
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
