import { describe, it, expect } from "vitest";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";

describe("MonthlyCompetence", () => {
  describe("create", () => {
    it("should create a valid MonthlyCompetence when month and year are valid", () => {
      const mc = MonthlyCompetence.create(3, 2026);
      expect(mc.month).toBe(3);
      expect(mc.year).toBe(2026);
    });

    it("should throw error when month is less than 1", () => {
      expect(() => MonthlyCompetence.create(0, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should throw error when month is greater than 12", () => {
      expect(() => MonthlyCompetence.create(13, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should throw error when month is not an integer", () => {
      expect(() => MonthlyCompetence.create(1.5, 2026)).toThrow(
        "Month must be an integer between 1 and 12",
      );
    });

    it("should throw error when year is less than 2000", () => {
      expect(() => MonthlyCompetence.create(1, 1999)).toThrow("Year must be an integer >= 2000");
    });

    it("should throw error when year is not an integer", () => {
      expect(() => MonthlyCompetence.create(1, 2026.5)).toThrow("Year must be an integer >= 2000");
    });

    it("should accept month when it equals the minimum value 1", () => {
      const mc = MonthlyCompetence.create(1, 2026);
      expect(mc.month).toBe(1);
    });

    it("should accept month when it equals the maximum value 12", () => {
      const mc = MonthlyCompetence.create(12, 2026);
      expect(mc.month).toBe(12);
    });

    it("should accept year when it equals the minimum value 2000", () => {
      const mc = MonthlyCompetence.create(1, 2000);
      expect(mc.year).toBe(2000);
    });
  });

  describe("isPastMonth", () => {
    const ref = new Date(2026, 2, 15); // March 2026

    it("should return true when month is in the past", () => {
      expect(MonthlyCompetence.create(1, 2026).isPastMonth(ref)).toBe(true);
    });

    it("should return true when year is in the past", () => {
      expect(MonthlyCompetence.create(12, 2025).isPastMonth(ref)).toBe(true);
    });

    it("should return false when month is the current month", () => {
      expect(MonthlyCompetence.create(3, 2026).isPastMonth(ref)).toBe(false);
    });

    it("should return false when month is in the future", () => {
      expect(MonthlyCompetence.create(4, 2026).isPastMonth(ref)).toBe(false);
    });

    it("should return false when year is in the future", () => {
      expect(MonthlyCompetence.create(1, 2027).isPastMonth(ref)).toBe(false);
    });
  });

  describe("isFutureOrCurrent", () => {
    const ref = new Date(2026, 2, 15); // March 2026

    it("should return true when month is the current month", () => {
      expect(MonthlyCompetence.create(3, 2026).isFutureOrCurrent(ref)).toBe(true);
    });

    it("should return true when month is in the future", () => {
      expect(MonthlyCompetence.create(6, 2026).isFutureOrCurrent(ref)).toBe(true);
    });

    it("should return false when month is in the past", () => {
      expect(MonthlyCompetence.create(2, 2026).isFutureOrCurrent(ref)).toBe(false);
    });
  });

  describe("comparison methods", () => {
    const jan26 = MonthlyCompetence.create(1, 2026);
    const mar26 = MonthlyCompetence.create(3, 2026);
    const mar26b = MonthlyCompetence.create(3, 2026);
    const jun26 = MonthlyCompetence.create(6, 2026);

    it("should return true for isBeforeOrEqual when date is before", () => {
      expect(jan26.isBeforeOrEqual(mar26)).toBe(true);
    });

    it("should return true for isBeforeOrEqual when dates are equal", () => {
      expect(mar26.isBeforeOrEqual(mar26b)).toBe(true);
    });

    it("should return false for isBeforeOrEqual when date is after", () => {
      expect(jun26.isBeforeOrEqual(mar26)).toBe(false);
    });

    it("should return true for isBefore when date is strictly before", () => {
      expect(jan26.isBefore(mar26)).toBe(true);
    });

    it("should return false for isBefore when dates are equal", () => {
      expect(mar26.isBefore(mar26b)).toBe(false);
    });

    it("should return true for isAfter when date is strictly after", () => {
      expect(jun26.isAfter(mar26)).toBe(true);
    });

    it("should return true for isAfterOrEqual when dates are equal", () => {
      expect(mar26.isAfterOrEqual(mar26b)).toBe(true);
    });

    it("should return true for equals when month and year are the same", () => {
      expect(mar26.equals(mar26b)).toBe(true);
    });

    it("should return false for equals when month or year differ", () => {
      expect(jan26.equals(mar26)).toBe(false);
    });
  });

  describe("toString", () => {
    it("should format as YYYY-MM when toString is called", () => {
      expect(MonthlyCompetence.create(3, 2026).toString()).toBe("2026-03");
    });

    it("should pad single-digit months when month is less than 10", () => {
      expect(MonthlyCompetence.create(1, 2026).toString()).toBe("2026-01");
    });
  });
});

describe("MonthlyCompetence year-level comparisons", () => {
  const earlier = MonthlyCompetence.create(12, 2025);
  const later = MonthlyCompetence.create(1, 2026);

  it("should treat an earlier year as before", () => {
    expect(earlier.isBefore(later)).toBe(true);
    expect(earlier.isBeforeOrEqual(later)).toBe(true);
  });

  it("should treat a later year as after", () => {
    expect(later.isAfter(earlier)).toBe(true);
    expect(later.isAfterOrEqual(earlier)).toBe(true);
  });

  it("should not treat an earlier year as after", () => {
    expect(earlier.isAfter(later)).toBe(false);
    expect(earlier.isAfterOrEqual(later)).toBe(false);
  });
});

describe("MonthlyCompetence.addMonths", () => {
  it("should advance within the same year", () => {
    const result = MonthlyCompetence.addMonths(MonthlyCompetence.create(3, 2026), 2);
    expect(result.toString()).toBe("2026-05");
  });

  it("should roll over into the next year", () => {
    const result = MonthlyCompetence.addMonths(MonthlyCompetence.create(11, 2026), 3);
    expect(result.toString()).toBe("2027-02");
  });

  it("should walk backwards with a negative offset", () => {
    const result = MonthlyCompetence.addMonths(MonthlyCompetence.create(3, 2026), -4);
    expect(result.toString()).toBe("2025-11");
  });

  it("should return an equal competence for a zero offset", () => {
    const result = MonthlyCompetence.addMonths(MonthlyCompetence.create(7, 2026), 0);
    expect(result.toString()).toBe("2026-07");
  });

  it("should land on December when the offset closes a year", () => {
    const result = MonthlyCompetence.addMonths(MonthlyCompetence.create(1, 2026), -1);
    expect(result.toString()).toBe("2025-12");
  });
});

describe("MonthlyCompetence.range", () => {
  it("should return a single competence when start equals end", () => {
    const month = MonthlyCompetence.create(4, 2026);
    expect(MonthlyCompetence.range(month, month).map(String)).toEqual(["2026-04"]);
  });

  it("should include both ends of the interval", () => {
    const range = MonthlyCompetence.range(
      MonthlyCompetence.create(1, 2026),
      MonthlyCompetence.create(4, 2026),
    );
    expect(range.map(String)).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });

  it("should cross the year boundary", () => {
    const range = MonthlyCompetence.range(
      MonthlyCompetence.create(11, 2026),
      MonthlyCompetence.create(2, 2027),
    );
    expect(range.map(String)).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("should return an empty list when the interval is inverted", () => {
    const range = MonthlyCompetence.range(
      MonthlyCompetence.create(6, 2026),
      MonthlyCompetence.create(3, 2026),
    );
    expect(range).toEqual([]);
  });

  it("should return twelve competences for a full year", () => {
    const range = MonthlyCompetence.range(
      MonthlyCompetence.create(1, 2026),
      MonthlyCompetence.create(12, 2026),
    );
    expect(range).toHaveLength(12);
  });
});
