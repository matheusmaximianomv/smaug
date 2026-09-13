import { describe, it, expect } from "vitest";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";

describe("FixedRevenueVersion entity", () => {
  const baseProps = {
    fixedRevenueId: "fixed-1",
    description: "Salário",
    amount: 8500,
    effectiveMonth: 3,
    effectiveYear: 2026,
  };

  it("should create a version and generate id and createdAt", () => {
    const version = FixedRevenueVersion.create(baseProps);

    expect(version.id).toEqual(expect.any(String));
    expect(version.fixedRevenueId).toBe("fixed-1");
    expect(version.description).toBe("Salário");
    expect(version.amount).toBe(8500);
    expect(version.effectiveMonth).toBe(3);
    expect(version.effectiveYear).toBe(2026);
    expect(version.createdAt).toBeInstanceOf(Date);
  });

  it("should honour the provided id and createdAt", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const version = FixedRevenueVersion.create({ ...baseProps, id: "version-1", createdAt });

    expect(version.id).toBe("version-1");
    expect(version.createdAt).toBe(createdAt);
  });

  it("should trim the description", () => {
    expect(FixedRevenueVersion.create({ ...baseProps, description: "  Salário  " }).description).toBe(
      "Salário",
    );
  });

  it("should accept an amount with two decimal places", () => {
    expect(FixedRevenueVersion.create({ ...baseProps, amount: 8500.55 }).amount).toBe(8500.55);
  });

  it("should throw for an empty description", () => {
    expect(() => FixedRevenueVersion.create({ ...baseProps, description: "   " })).toThrow(
      "Description must be between 1 and 255 characters",
    );
  });

  it("should throw for a description longer than 255 characters", () => {
    expect(() => FixedRevenueVersion.create({ ...baseProps, description: "a".repeat(256) })).toThrow(
      "Description must be between 1 and 255 characters",
    );
  });

  it("should throw for a non-positive amount", () => {
    expect(() => FixedRevenueVersion.create({ ...baseProps, amount: 0 })).toThrow(
      "Amount must be greater than 0",
    );
  });

  it("should throw for an amount with more than two decimal places", () => {
    expect(() => FixedRevenueVersion.create({ ...baseProps, amount: 8500.555 })).toThrow(
      "Amount must have at most 2 decimal places",
    );
  });

  it("should expose the effective competence", () => {
    const competence = FixedRevenueVersion.create(baseProps).getEffectiveCompetence();

    expect(competence.month).toBe(3);
    expect(competence.year).toBe(2026);
  });
});
