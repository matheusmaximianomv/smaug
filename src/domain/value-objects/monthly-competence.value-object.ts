const MIN_MONTH = 1;
const MAX_MONTH = 12;
const MIN_YEAR = 2000;
const MONTH_PAD_LENGTH = 2;

export class MonthlyCompetence {
  public readonly month: number;
  public readonly year: number;

  private constructor(month: number, year: number) {
    this.month = month;
    this.year = year;
  }

  public static create(month: number, year: number): MonthlyCompetence {
    if (!Number.isInteger(month) || month < MIN_MONTH || month > MAX_MONTH) {
      throw new Error("Month must be an integer between 1 and 12");
    }
    if (!Number.isInteger(year) || year < MIN_YEAR) {
      throw new Error("Year must be an integer >= 2000");
    }
    return new MonthlyCompetence(month, year);
  }

  public isPastMonth(referenceDate: Date = new Date()): boolean {
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1;

    if (this.year < refYear) return true;
    if (this.year === refYear && this.month < refMonth) return true;
    return false;
  }

  public isFutureOrCurrent(referenceDate: Date = new Date()): boolean {
    return !this.isPastMonth(referenceDate);
  }

  public isBeforeOrEqual(other: MonthlyCompetence): boolean {
    if (this.year < other.year) return true;
    if (this.year === other.year && this.month <= other.month) return true;
    return false;
  }

  public isBefore(other: MonthlyCompetence): boolean {
    if (this.year < other.year) return true;
    if (this.year === other.year && this.month < other.month) return true;
    return false;
  }

  public isAfter(other: MonthlyCompetence): boolean {
    return !this.isBeforeOrEqual(other);
  }

  public isAfterOrEqual(other: MonthlyCompetence): boolean {
    return !this.isBefore(other);
  }

  public equals(other: MonthlyCompetence): boolean {
    return this.month === other.month && this.year === other.year;
  }

  public toString(): string {
    return `${this.year}-${String(this.month).padStart(MONTH_PAD_LENGTH, "0")}`;
  }
}
