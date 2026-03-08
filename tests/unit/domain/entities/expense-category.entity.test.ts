import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("ExpenseCategory", () => {
  const validProps = {
    userId: "user-123",
    name: "Transporte",
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("create", () => {
    it("should create expense category when data is valid", () => {
      const category = ExpenseCategory.create(validProps);

      expect(category.id).toBeDefined();
      expect(category.userId).toBe("user-123");
      expect(category.name).toBe("Transporte");
      expect(category.nameLower).toBe("transporte");
      expect(category.createdAt).toEqual(BASE_DATE);
      expect(category.updatedAt).toEqual(BASE_DATE);
    });

    it("should trim name and persist lowercase variant when name has surrounding spaces", () => {
      const category = ExpenseCategory.create({ ...validProps, name: "  Aluguel  " });

      expect(category.name).toBe("Aluguel");
      expect(category.nameLower).toBe("aluguel");
    });

    it("should throw error when name is empty after trimming", () => {
      expect(() => ExpenseCategory.create({ ...validProps, name: "   " })).toThrow(
        "Name must be between 1 and 100 characters",
      );
    });

    it("should throw error when name exceeds maximum length", () => {
      expect(() => ExpenseCategory.create({ ...validProps, name: "a".repeat(101) })).toThrow(
        "Name must be between 1 and 100 characters",
      );
    });
  });

  describe("updateName", () => {
    it("should update name variants and timestamp when new valid name is provided", () => {
      const category = ExpenseCategory.create(validProps);
      const nextInstant = new Date(BASE_DATE.getTime() + 1_000);
      vi.setSystemTime(nextInstant);

      const updated = category.updateName("Essenciais");

      expect(updated.id).toBe(category.id);
      expect(updated.userId).toBe(category.userId);
      expect(updated.name).toBe("Essenciais");
      expect(updated.nameLower).toBe("essenciais");
      expect(updated.createdAt).toEqual(category.createdAt);
      expect(updated.updatedAt.getTime()).toBeGreaterThan(category.updatedAt.getTime());
    });

    it("should throw error when new name is invalid", () => {
      const category = ExpenseCategory.create(validProps);

      expect(() => category.updateName(" ")).toThrow("Name must be between 1 and 100 characters");
    });
  });
});
