import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

const MAX_DECIMAL_PLACES = 2;
const MIN_INSTALLMENT_NUMBER = 1;

export interface InstallmentProps {
  id?: string;
  installmentExpenseId: string;
  installmentNumber: number;
  amount: number;
  competenceMonth: number;
  competenceYear: number;
  createdAt?: Date;
}

type InstallmentPersistenceProps = Required<InstallmentProps>;

export class Installment {
  public readonly id: string;
  public readonly installmentExpenseId: string;
  public readonly installmentNumber: number;
  public readonly amount: number;
  public readonly competenceMonth: number;
  public readonly competenceYear: number;
  public readonly createdAt: Date;

  private constructor(props: InstallmentPersistenceProps) {
    this.id = props.id;
    this.installmentExpenseId = props.installmentExpenseId;
    this.installmentNumber = props.installmentNumber;
    this.amount = props.amount;
    this.competenceMonth = props.competenceMonth;
    this.competenceYear = props.competenceYear;
    this.createdAt = props.createdAt;
  }

  public static create(props: InstallmentProps): Installment {
    Installment.validateInstallmentNumber(props.installmentNumber);
    Installment.validateAmount(props.amount);

    const competence = MonthlyCompetence.create(props.competenceMonth, props.competenceYear);

    return new Installment({
      id: props.id ?? randomUUID(),
      installmentExpenseId: props.installmentExpenseId,
      installmentNumber: props.installmentNumber,
      amount: props.amount,
      competenceMonth: competence.month,
      competenceYear: competence.year,
      createdAt: props.createdAt ?? new Date(),
    });
  }

  public getCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.competenceMonth, this.competenceYear);
  }

  private static validateInstallmentNumber(installmentNumber: number): void {
    if (!Number.isInteger(installmentNumber) || installmentNumber < MIN_INSTALLMENT_NUMBER) {
      throw new Error("Installment number must be an integer greater than or equal to 1");
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
