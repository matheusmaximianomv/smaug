import { describe, it, expect } from "vitest";
import {
  updateOneTimeExpenseSchema,
  listOneTimeExpenseQuerySchema,
} from "@src/application/dtos/one-time-expense.dto";

describe("updateOneTimeExpenseSchema", () => {
  it.each([
    ["description", { description: "Jantar de aniversário" }],
    ["amount", { amount: 180 }],
    ["categoryId", { categoryId: "category-2" }],
    ["competenceYear", { competenceYear: 2027 }],
    ["competenceMonth", { competenceMonth: 5 }],
  ])("should accept a payload with only the %s", (_field, payload) => {
    expect(updateOneTimeExpenseSchema.safeParse(payload).success).toBe(true);
  });

  it("should reject an empty payload", () => {
    const result = updateOneTimeExpenseSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("At least one field must be provided");
  });

  it("should reject an out-of-range competence month", () => {
    expect(updateOneTimeExpenseSchema.safeParse({ competenceMonth: 13 }).success).toBe(false);
  });
});

describe("listOneTimeExpenseQuerySchema", () => {
  it("should accept an empty query", () => {
    expect(listOneTimeExpenseQuerySchema.safeParse({}).success).toBe(true);
  });

  it("should coerce a complete competence to numbers", () => {
    const result = listOneTimeExpenseQuerySchema.safeParse({
      competenceYear: "2026",
      competenceMonth: "3",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ competenceYear: 2026, competenceMonth: 3 });
  });

  it("should reject the year without the month", () => {
    const result = listOneTimeExpenseQuerySchema.safeParse({ competenceYear: "2026" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(
      "Competence year and month must be provided together",
    );
  });

  it("should reject the month without the year", () => {
    expect(listOneTimeExpenseQuerySchema.safeParse({ competenceMonth: "3" }).success).toBe(false);
  });

  it("should reject a non-numeric year", () => {
    expect(
      listOneTimeExpenseQuerySchema.safeParse({ competenceYear: "abc", competenceMonth: "3" })
        .success,
    ).toBe(false);
  });

  it("should reject a month outside 1..12", () => {
    expect(
      listOneTimeExpenseQuerySchema.safeParse({ competenceYear: "2026", competenceMonth: "13" })
        .success,
    ).toBe(false);
  });
});
