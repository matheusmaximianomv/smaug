import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Installment } from "@src/domain/entities/installment.entity";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("Installment", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should create installment when data is valid", () => {
    const installment = Installment.create({
      installmentExpenseId: "expense-1",
      installmentNumber: 1,
      amount: 250.5,
      competenceMonth: 3,
      competenceYear: 2026,
    });

    expect(installment.installmentExpenseId).toBe("expense-1");
    expect(installment.installmentNumber).toBe(1);
    expect(installment.amount).toBe(250.5);
    expect(installment.competenceMonth).toBe(3);
    expect(installment.competenceYear).toBe(2026);
    expect(installment.createdAt.toISOString()).toBe(BASE_DATE.toISOString());
  });

  it("should throw error when amount is non positive", () => {
    expect(() =>
      Installment.create({
        installmentExpenseId: "expense-1",
        installmentNumber: 1,
        amount: 0,
        competenceMonth: 3,
        competenceYear: 2026,
      }),
    ).toThrow("Amount must be greater than 0");
  });

  it("should throw error when amount has more than two decimals", () => {
    expect(() =>
      Installment.create({
        installmentExpenseId: "expense-1",
        installmentNumber: 1,
        amount: 10.123,
        competenceMonth: 3,
        competenceYear: 2026,
      }),
    ).toThrow("Amount must have at most 2 decimal places");
  });

  it("should throw error when installment number is less than one", () => {
    expect(() =>
      Installment.create({
        installmentExpenseId: "expense-1",
        installmentNumber: 0,
        amount: 10,
        competenceMonth: 3,
        competenceYear: 2026,
      }),
    ).toThrow("Installment number must be an integer greater than or equal to 1");
  });

  it("should expose competence through value object when requested", () => {
    const installment = Installment.create({
      installmentExpenseId: "expense-1",
      installmentNumber: 1,
      amount: 120,
      competenceMonth: 5,
      competenceYear: 2026,
    });

    const competence = installment.getCompetence();

    expect(competence).toBeInstanceOf(MonthlyCompetence);
    expect(competence.month).toBe(5);
    expect(competence.year).toBe(2026);
  });
});
