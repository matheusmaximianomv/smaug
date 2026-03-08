import { randomUUID } from "crypto";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { PastCompetenceError, EndDateBeforeStartError } from "@src/domain/errors/domain-error";

export interface RecurringExpenseProps {
  id?: string;
  userId: string;
  startMonth: number;
  startYear: number;
  endMonth?: number | null;
  endYear?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecurringExpensePersistenceProps
  extends Required<Omit<RecurringExpenseProps, "endMonth" | "endYear">> {
  endMonth: number | null;
  endYear: number | null;
}

export class RecurringExpense {
  public readonly id: string;
  public readonly userId: string;
  public readonly startMonth: number;
  public readonly startYear: number;
  public readonly endMonth: number | null;
  public readonly endYear: number | null;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: RecurringExpensePersistenceProps) {
    this.id = props.id;
    this.userId = props.userId;
    this.startMonth = props.startMonth;
    this.startYear = props.startYear;
    this.endMonth = props.endMonth;
    this.endYear = props.endYear;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: RecurringExpenseProps): RecurringExpense {
    const start = MonthlyCompetence.create(props.startMonth, props.startYear);

    if (start.isPastMonth()) {
      throw new PastCompetenceError();
    }

    let endMonth: number | null = null;
    let endYear: number | null = null;

    if (props.endMonth != null && props.endYear != null) {
      const end = MonthlyCompetence.create(props.endMonth, props.endYear);
      if (end.isBefore(start)) {
        throw new EndDateBeforeStartError();
      }
      endMonth = end.month;
      endYear = end.year;
    }

    const now = new Date();
    return new RecurringExpense({
      id: props.id ?? randomUUID(),
      userId: props.userId,
      startMonth: start.month,
      startYear: start.year,
      endMonth,
      endYear,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  public static rehydrate(props: RecurringExpensePersistenceProps): RecurringExpense {
    return new RecurringExpense(props);
  }

  public terminate(endMonth: number, endYear: number): RecurringExpense {
    const termination = MonthlyCompetence.create(endMonth, endYear);
    const start = this.getStartCompetence();
    if (termination.isBefore(start)) {
      throw new EndDateBeforeStartError();
    }

    return new RecurringExpense({
      id: this.id,
      userId: this.userId,
      startMonth: this.startMonth,
      startYear: this.startYear,
      endMonth: termination.month,
      endYear: termination.year,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public clearTermination(): RecurringExpense {
    return new RecurringExpense({
      id: this.id,
      userId: this.userId,
      startMonth: this.startMonth,
      startYear: this.startYear,
      endMonth: null,
      endYear: null,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  public isActiveForMonth(month: number, year: number): boolean {
    const target = MonthlyCompetence.create(month, year);
    const start = this.getStartCompetence();
    if (target.isBefore(start)) {
      return false;
    }

    if (this.endMonth != null && this.endYear != null) {
      const end = MonthlyCompetence.create(this.endMonth, this.endYear);
      if (target.isAfter(end)) {
        return false;
      }
    }

    return true;
  }

  public getStartCompetence(): MonthlyCompetence {
    return MonthlyCompetence.create(this.startMonth, this.startYear);
  }

  public getEndCompetence(): MonthlyCompetence | null {
    if (this.endMonth == null || this.endYear == null) {
      return null;
    }
    return MonthlyCompetence.create(this.endMonth, this.endYear);
  }
}
