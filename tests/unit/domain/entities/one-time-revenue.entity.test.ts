import { describe, it, expect } from "vitest";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";

describe("OneTimeRevenue Entity", () => {
  const validProps = {
    userId: "user-123",
    description: "Freelance",
    amount: 1500.0,
    competenceMonth: 3,
    competenceYear: 2026,
  };

  describe("create", () => {
    it("should create a valid one-time revenue", () => {
      const revenue = OneTimeRevenue.create(validProps);
      expect(revenue.id).toBeDefined();
      expect(revenue.userId).toBe("user-123");
      expect(revenue.description).toBe("Freelance");
      expect(revenue.amount).toBe(1500.0);
      expect(revenue.competenceMonth).toBe(3);
      expect(revenue.competenceYear).toBe(2026);
      expect(revenue.createdAt).toBeInstanceOf(Date);
      expect(revenue.updatedAt).toBeInstanceOf(Date);
    });

    it("should use provided id", () => {
      const revenue = OneTimeRevenue.create({ ...validProps, id: "custom-id" });
      expect(revenue.id).toBe("custom-id");
    });
  });

  describe("amount validation", () => {
    it("should reject zero amount", () => {
      expect(() => OneTimeRevenue.create({ ...validProps, amount: 0 })).toThrow(
        "Amount must be greater than 0",
      );
    });

    it("should reject negative amount", () => {
      expect(() => OneTimeRevenue.create({ ...validProps, amount: -100 })).toThrow(
        "Amount must be greater than 0",
      );
    });

    it("should reject amount with more than 2 decimal places", () => {
      expect(() => OneTimeRevenue.create({ ...validProps, amount: 100.123 })).toThrow(
        "Amount must have at most 2 decimal places",
      );
    });

    it("should accept amount with exactly 2 decimal places", () => {
      const revenue = OneTimeRevenue.create({ ...validProps, amount: 100.99 });
      expect(revenue.amount).toBe(100.99);
    });

    it("should accept integer amount", () => {
      const revenue = OneTimeRevenue.create({ ...validProps, amount: 100 });
      expect(revenue.amount).toBe(100);
    });

    it("should accept amount with 1 decimal place", () => {
      const revenue = OneTimeRevenue.create({ ...validProps, amount: 100.5 });
      expect(revenue.amount).toBe(100.5);
    });
  });

  describe("description validation", () => {
    it("should reject empty description", () => {
      expect(() => OneTimeRevenue.create({ ...validProps, description: "" })).toThrow(
        "Description must be between 1 and 255 characters",
      );
    });

    it("should reject whitespace-only description", () => {
      expect(() => OneTimeRevenue.create({ ...validProps, description: "   " })).toThrow(
        "Description must be between 1 and 255 characters",
      );
    });

    it("should reject description > 255 characters", () => {
      expect(() =>
        OneTimeRevenue.create({ ...validProps, description: "a".repeat(256) }),
      ).toThrow("Description must be between 1 and 255 characters");
    });

    it("should accept description with 255 characters", () => {
      const desc = "a".repeat(255);
      const revenue = OneTimeRevenue.create({ ...validProps, description: desc });
      expect(revenue.description).toBe(desc);
    });

    it("should trim description", () => {
      const revenue = OneTimeRevenue.create({ ...validProps, description: "  Freelance  " });
      expect(revenue.description).toBe("Freelance");
    });
  });

  describe("competence validation", () => {
    it("should reject month < 1", () => {
      expect(() =>
        OneTimeRevenue.create({ ...validProps, competenceMonth: 0 }),
      ).toThrow("Month must be an integer between 1 and 12");
    });

    it("should reject month > 12", () => {
      expect(() =>
        OneTimeRevenue.create({ ...validProps, competenceMonth: 13 }),
      ).toThrow("Month must be an integer between 1 and 12");
    });

    it("should reject year < 2000", () => {
      expect(() =>
        OneTimeRevenue.create({ ...validProps, competenceYear: 1999 }),
      ).toThrow("Year must be an integer >= 2000");
    });
  });

  describe("update", () => {
    it("should update description", () => {
      const revenue = OneTimeRevenue.create(validProps);
      const updated = revenue.update({ description: "Updated" });
      expect(updated.description).toBe("Updated");
      expect(updated.amount).toBe(1500.0);
    });

    it("should update amount", () => {
      const revenue = OneTimeRevenue.create(validProps);
      const updated = revenue.update({ amount: 2000 });
      expect(updated.amount).toBe(2000);
      expect(updated.description).toBe("Freelance");
    });

    it("should update both fields", () => {
      const revenue = OneTimeRevenue.create(validProps);
      const updated = revenue.update({ description: "Updated", amount: 2000 });
      expect(updated.description).toBe("Updated");
      expect(updated.amount).toBe(2000);
    });

    it("should validate updated amount", () => {
      const revenue = OneTimeRevenue.create(validProps);
      expect(() => revenue.update({ amount: -1 })).toThrow("Amount must be greater than 0");
    });

    it("should validate updated description", () => {
      const revenue = OneTimeRevenue.create(validProps);
      expect(() => revenue.update({ description: "" })).toThrow(
        "Description must be between 1 and 255 characters",
      );
    });

    it("should preserve id and competence on update", () => {
      const revenue = OneTimeRevenue.create(validProps);
      const updated = revenue.update({ description: "New" });
      expect(updated.id).toBe(revenue.id);
      expect(updated.competenceMonth).toBe(revenue.competenceMonth);
      expect(updated.competenceYear).toBe(revenue.competenceYear);
    });
  });
});
