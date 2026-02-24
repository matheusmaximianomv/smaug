export class MonthlyCompetence {
  readonly month: number;
  readonly year: number;

  private constructor(month: number, year: number) {
    this.month = month;
    this.year = year;
  }

  static create(month: number, year: number): MonthlyCompetence {
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error("Month must be an integer between 1 and 12");
    }
    if (!Number.isInteger(year) || year < 2000) {
      throw new Error("Year must be an integer >= 2000");
    }
    return new MonthlyCompetence(month, year);
  }

  isPastMonth(referenceDate: Date = new Date()): boolean {
    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth() + 1;

    if (this.year < refYear) return true;
    if (this.year === refYear && this.month < refMonth) return true;
    return false;
  }

  isFutureOrCurrent(referenceDate: Date = new Date()): boolean {
    return !this.isPastMonth(referenceDate);
  }

  isBeforeOrEqual(other: MonthlyCompetence): boolean {
    if (this.year < other.year) return true;
    if (this.year === other.year && this.month <= other.month) return true;
    return false;
  }

  isBefore(other: MonthlyCompetence): boolean {
    if (this.year < other.year) return true;
    if (this.year === other.year && this.month < other.month) return true;
    return false;
  }

  isAfter(other: MonthlyCompetence): boolean {
    return !this.isBeforeOrEqual(other);
  }

  isAfterOrEqual(other: MonthlyCompetence): boolean {
    return !this.isBefore(other);
  }

  equals(other: MonthlyCompetence): boolean {
    return this.month === other.month && this.year === other.year;
  }

  toString(): string {
    return `${this.year}-${String(this.month).padStart(2, "0")}`;
  }
}
