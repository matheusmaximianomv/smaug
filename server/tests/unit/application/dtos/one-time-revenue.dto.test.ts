import { describe, it, expect } from "vitest";
import {
  createOneTimeRevenueSchema,
  updateOneTimeRevenueSchema,
} from "@src/application/dtos/one-time-revenue.dto";

describe("createOneTimeRevenueSchema", () => {
  const valid = {
    description: "Bônus",
    amount: 1200,
    competenceYear: 2026,
    competenceMonth: 3,
  };

  it("should accept a complete payload", () => {
    expect(createOneTimeRevenueSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["description", { description: "" }],
    ["description", { description: "a".repeat(256) }],
    ["amount", { amount: 0 }],
    ["competenceYear", { competenceYear: 1999 }],
    ["competenceYear", { competenceYear: 2026.5 }],
    ["competenceMonth", { competenceMonth: 0 }],
    ["competenceMonth", { competenceMonth: 13 }],
  ])("should reject an invalid %s", (_field, override) => {
    expect(createOneTimeRevenueSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("updateOneTimeRevenueSchema", () => {
  it("should accept a payload with only the description", () => {
    expect(updateOneTimeRevenueSchema.safeParse({ description: "Bônus anual" }).success).toBe(true);
  });

  it("should accept a payload with only the amount", () => {
    expect(updateOneTimeRevenueSchema.safeParse({ amount: 1500 }).success).toBe(true);
  });

  it("should reject an empty payload", () => {
    const result = updateOneTimeRevenueSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "At least one field (description or amount) must be provided",
    );
  });

  it("should reject an invalid amount", () => {
    expect(updateOneTimeRevenueSchema.safeParse({ amount: -1 }).success).toBe(false);
  });
});
