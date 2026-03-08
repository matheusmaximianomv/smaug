import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";

const BASE_DATE = new Date("2026-03-01T12:00:00.000Z");

describe("OneTimeExpense", () => {
  const validProps = {
    userId: "user-123",
    categoryId: "category-456",
    description: "Jantar",
    amount: 150.5,
    competenceMonth: 3,
    competenceYear: 2026,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("create", () => {
    it("should create one-time expense when props are valid", () => {
      const expense = OneTimeExpense.create(validProps);

      expect(expense.id).toBeDefined();
      expect(expense.userId).toBe(validProps.userId);
      expect(expense.categoryId).toBe(validProps.categoryId);
      expect(expense.description).toBe(validProps.description);
      expect(expense.amount).toBe(validProps.amount);
      expect(expense.competenceMonth).toBe(validProps.competenceMonth);
      expect(expense.competenceYear).toBe(validProps.competenceYear);
      expect(expense.createdAt).toEqual(BASE_DATE);
      expect(expense.updatedAt).toEqual(BASE_DATE);
    });

    it("should trim description before persisting", () => {
      const expense = OneTimeExpense.create({ ...validProps, description: "  Jantar " });
      expect(expense.description).toBe("Jantar");
    });

    it("should throw error when amount is not greater than zero", () => {
      expect(() => OneTimeExpense.create({ ...validProps, amount: 0 })).toThrow(
        "Amount must be greater than 0",
      );
    });

    it("should throw error when amount has more than two decimal places", () => {
      expect(() => OneTimeExpense.create({ ...validProps, amount: 10.123 })).toThrow(
        "Amount must have at most 2 decimal places",
      );
    });

    it("should throw error when description is empty after trimming", () => {
      expect(() => OneTimeExpense.create({ ...validProps, description: "  " })).toThrow(
        "Description must be between",
      );
    });

    it("should throw error when competence month is invalid", () => {
      expect(() => OneTimeExpense.create({ ...validProps, competenceMonth: 13 })).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });
  });

  describe("update", () => {
    it("should update mutable fields and refresh updatedAt when data is valid", () => {
      const expense = OneTimeExpense.create(validProps);
      const nextInstant = new Date(BASE_DATE.getTime() + 1_000);
      vi.setSystemTime(nextInstant);

      const updated = expense.update({
        description: "Mercado",
        amount: 200,
        categoryId: "category-789",
        competenceMonth: 4,
        competenceYear: 2026,
      });

      expect(updated.description).toBe("Mercado");
      expect(updated.amount).toBe(200);
      expect(updated.categoryId).toBe("category-789");
      expect(updated.competenceMonth).toBe(4);
      expect(updated.competenceYear).toBe(2026);
      expect(updated.updatedAt).toEqual(nextInstant);
      expect(updated.createdAt).toEqual(expense.createdAt);
      expect(updated.id).toBe(expense.id);
    });

    it("should throw error when updated amount is invalid", () => {
      const expense = OneTimeExpense.create(validProps);

      expect(() => expense.update({ amount: -10 })).toThrow("Amount must be greater than 0");
    });

    it("should throw error when updated description is invalid", () => {
      const expense = OneTimeExpense.create(validProps);

      expect(() => expense.update({ description: "" })).toThrow(
        "Description must be between",
      );
    });
  });
});
