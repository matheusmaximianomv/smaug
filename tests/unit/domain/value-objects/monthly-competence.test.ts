import { describe, it, expect } from "vitest";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

describe("MonthlyCompetence", () => {
  describe("create", () => {
    it("should create a valid MonthlyCompetence", () => {
      const mc = MonthlyCompetence.create(3, 2026);
      expect(mc.month).toBe(3);
      expect(mc.year).toBe(2026);
    });

    it("should reject month < 1", () => {
      expect(() => MonthlyCompetence.create(0, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should reject month > 12", () => {
      expect(() => MonthlyCompetence.create(13, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should reject non-integer month", () => {
      expect(() => MonthlyCompetence.create(1.5, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should reject year < 2000", () => {
      expect(() => MonthlyCompetence.create(1, 1999)).toThrow(
        "Year must be an integer >= 2000",
      );
    });

    it("should reject non-integer year", () => {
      expect(() => MonthlyCompetence.create(1, 2026.5)).toThrow(
        "Year must be an integer >= 2000",
      );
    });

    it("should accept boundary month 1", () => {
      const mc = MonthlyCompetence.create(1, 2026);
      expect(mc.month).toBe(1);
    });

    it("should accept boundary month 12", () => {
      const mc = MonthlyCompetence.create(12, 2026);
      expect(mc.month).toBe(12);
    });

    it("should accept boundary year 2000", () => {
      const mc = MonthlyCompetence.create(1, 2000);
      expect(mc.year).toBe(2000);
    });
  });

  describe("isPastMonth", () => {
    const ref = new Date(2026, 2, 15); // March 2026

    it("should return true for a past month", () => {
      expect(MonthlyCompetence.create(1, 2026).isPastMonth(ref)).toBe(true);
    });

    it("should return true for a past year", () => {
      expect(MonthlyCompetence.create(12, 2025).isPastMonth(ref)).toBe(true);
    });

    it("should return false for the current month", () => {
      expect(MonthlyCompetence.create(3, 2026).isPastMonth(ref)).toBe(false);
    });

    it("should return false for a future month", () => {
      expect(MonthlyCompetence.create(4, 2026).isPastMonth(ref)).toBe(false);
    });

    it("should return false for a future year", () => {
      expect(MonthlyCompetence.create(1, 2027).isPastMonth(ref)).toBe(false);
    });
  });

  describe("isFutureOrCurrent", () => {
    const ref = new Date(2026, 2, 15); // March 2026

    it("should return true for the current month", () => {
      expect(MonthlyCompetence.create(3, 2026).isFutureOrCurrent(ref)).toBe(true);
    });

    it("should return true for a future month", () => {
      expect(MonthlyCompetence.create(6, 2026).isFutureOrCurrent(ref)).toBe(true);
    });

    it("should return false for a past month", () => {
      expect(MonthlyCompetence.create(2, 2026).isFutureOrCurrent(ref)).toBe(false);
    });
  });

  describe("comparison methods", () => {
    const jan26 = MonthlyCompetence.create(1, 2026);
    const mar26 = MonthlyCompetence.create(3, 2026);
    const mar26b = MonthlyCompetence.create(3, 2026);
    const jun26 = MonthlyCompetence.create(6, 2026);

    it("isBeforeOrEqual should return true when before", () => {
      expect(jan26.isBeforeOrEqual(mar26)).toBe(true);
    });

    it("isBeforeOrEqual should return true when equal", () => {
      expect(mar26.isBeforeOrEqual(mar26b)).toBe(true);
    });

    it("isBeforeOrEqual should return false when after", () => {
      expect(jun26.isBeforeOrEqual(mar26)).toBe(false);
    });

    it("isBefore should return true when strictly before", () => {
      expect(jan26.isBefore(mar26)).toBe(true);
    });

    it("isBefore should return false when equal", () => {
      expect(mar26.isBefore(mar26b)).toBe(false);
    });

    it("isAfter should return true when strictly after", () => {
      expect(jun26.isAfter(mar26)).toBe(true);
    });

    it("isAfterOrEqual should return true when equal", () => {
      expect(mar26.isAfterOrEqual(mar26b)).toBe(true);
    });

    it("equals should return true for same month/year", () => {
      expect(mar26.equals(mar26b)).toBe(true);
    });

    it("equals should return false for different month/year", () => {
      expect(jan26.equals(mar26)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should format as YYYY-MM", () => {
      expect(MonthlyCompetence.create(3, 2026).toString()).toBe("2026-03");
    });

    it("should pad single-digit months", () => {
      expect(MonthlyCompetence.create(1, 2026).toString()).toBe("2026-01");
    });
  });
});
