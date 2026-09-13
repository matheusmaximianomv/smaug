import { describe, it, expect } from "vitest";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";

describe("FixedRevenue entity", () => {
  const baseProps = {
    userId: "user-1",
    modality: "ALTERABLE" as const,
    startMonth: 3,
    startYear: 2026,
  };

  describe("create", () => {
    it("should create without an end competence", () => {
      const revenue = FixedRevenue.create(baseProps);

      expect(revenue.id).toEqual(expect.any(String));
      expect(revenue.userId).toBe("user-1");
      expect(revenue.modality).toBe("ALTERABLE");
      expect(revenue.startMonth).toBe(3);
      expect(revenue.startYear).toBe(2026);
      expect(revenue.endMonth).toBeNull();
      expect(revenue.endYear).toBeNull();
      expect(revenue.createdAt).toBeInstanceOf(Date);
      expect(revenue.updatedAt).toBeInstanceOf(Date);
    });

    it("should create with an end competence", () => {
      const revenue = FixedRevenue.create({ ...baseProps, endMonth: 12, endYear: 2026 });

      expect(revenue.endMonth).toBe(12);
      expect(revenue.endYear).toBe(2026);
    });

    it("should honour the provided id and timestamps", () => {
      const createdAt = new Date("2026-01-01T00:00:00.000Z");
      const updatedAt = new Date("2026-02-01T00:00:00.000Z");
      const revenue = FixedRevenue.create({ ...baseProps, id: "fixed-1", createdAt, updatedAt });

      expect(revenue.id).toBe("fixed-1");
      expect(revenue.createdAt).toBe(createdAt);
      expect(revenue.updatedAt).toBe(updatedAt);
    });

    it("should ignore a partial end competence (only the month)", () => {
      const revenue = FixedRevenue.create({ ...baseProps, endMonth: 12 });

      expect(revenue.endMonth).toBeNull();
      expect(revenue.endYear).toBeNull();
    });

    it("should ignore a partial end competence (only the year)", () => {
      const revenue = FixedRevenue.create({ ...baseProps, endYear: 2026 });

      expect(revenue.endMonth).toBeNull();
      expect(revenue.endYear).toBeNull();
    });

    it("should throw when the end competence precedes the start", () => {
      expect(() =>
        FixedRevenue.create({ ...baseProps, endMonth: 1, endYear: 2026 }),
      ).toThrow("End date must be on or after start date");
    });

    it("should throw for an invalid modality", () => {
      expect(() =>
        FixedRevenue.create({
          ...baseProps,
          modality: "WHATEVER" as unknown as "ALTERABLE",
        }),
      ).toThrow('Modality must be "ALTERABLE" or "UNALTERABLE"');
    });

    it("should accept the UNALTERABLE modality", () => {
      expect(FixedRevenue.create({ ...baseProps, modality: "UNALTERABLE" }).modality).toBe(
        "UNALTERABLE",
      );
    });
  });

  describe("terminate", () => {
    it("should return a new instance with the end competence", () => {
      const revenue = FixedRevenue.create({ ...baseProps, id: "fixed-1" });

      const terminated = revenue.terminate(8, 2026);

      expect(terminated).not.toBe(revenue);
      expect(terminated.id).toBe("fixed-1");
      expect(terminated.endMonth).toBe(8);
      expect(terminated.endYear).toBe(2026);
      expect(terminated.createdAt).toBe(revenue.createdAt);
    });

    it("should allow terminating on the start competence itself", () => {
      const revenue = FixedRevenue.create(baseProps);

      expect(revenue.terminate(3, 2026).endMonth).toBe(3);
    });

    it("should throw when the end competence precedes the start", () => {
      const revenue = FixedRevenue.create(baseProps);

      expect(() => revenue.terminate(2, 2026)).toThrow("End date must be on or after start date");
    });
  });

  describe("isActiveForMonth", () => {
    it("should be inactive before the start competence", () => {
      expect(FixedRevenue.create(baseProps).isActiveForMonth(2, 2026)).toBe(false);
    });

    it("should be active on the start competence", () => {
      expect(FixedRevenue.create(baseProps).isActiveForMonth(3, 2026)).toBe(true);
    });

    it("should be active indefinitely when there is no end competence", () => {
      expect(FixedRevenue.create(baseProps).isActiveForMonth(12, 2030)).toBe(true);
    });

    it("should be active on the end competence", () => {
      const revenue = FixedRevenue.create({ ...baseProps, endMonth: 6, endYear: 2026 });

      expect(revenue.isActiveForMonth(6, 2026)).toBe(true);
    });

    it("should be inactive after the end competence", () => {
      const revenue = FixedRevenue.create({ ...baseProps, endMonth: 6, endYear: 2026 });

      expect(revenue.isActiveForMonth(7, 2026)).toBe(false);
    });
  });

  describe("competence getters", () => {
    it("should expose the start competence", () => {
      const start = FixedRevenue.create(baseProps).getStartCompetence();

      expect(start.month).toBe(3);
      expect(start.year).toBe(2026);
    });

    it("should expose the end competence when it exists", () => {
      const end = FixedRevenue.create({
        ...baseProps,
        endMonth: 9,
        endYear: 2026,
      }).getEndCompetence();

      expect(end?.month).toBe(9);
      expect(end?.year).toBe(2026);
    });

    it("should return null when there is no end competence", () => {
      expect(FixedRevenue.create(baseProps).getEndCompetence()).toBeNull();
    });
  });
});
