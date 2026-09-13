import { describe, it, expect } from "vitest";
import {
  createRecurringExpenseSchema,
  updateRecurringExpenseSchema,
} from "@src/application/dtos/recurring-expense.dto";

describe("createRecurringExpenseSchema", () => {
  const valid = {
    description: "Aluguel",
    amount: 2000,
    categoryId: "category-1",
    startYear: 2026,
    startMonth: 3,
  };

  it("should accept a payload without an end competence", () => {
    expect(createRecurringExpenseSchema.safeParse(valid).success).toBe(true);
  });

  it("should accept a payload with a complete end competence", () => {
    expect(
      createRecurringExpenseSchema.safeParse({ ...valid, endYear: 2026, endMonth: 12 }).success,
    ).toBe(true);
  });

  it("should accept an explicitly null end competence", () => {
    expect(
      createRecurringExpenseSchema.safeParse({ ...valid, endYear: null, endMonth: null }).success,
    ).toBe(true);
  });

  it("should reject an end year without an end month", () => {
    const result = createRecurringExpenseSchema.safeParse({ ...valid, endYear: 2026 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("End month and year must both be provided");
  });

  it("should reject an end month without an end year", () => {
    expect(createRecurringExpenseSchema.safeParse({ ...valid, endMonth: 12 }).success).toBe(false);
  });

  it("should reject an end year set to null alongside a filled end month", () => {
    expect(
      createRecurringExpenseSchema.safeParse({ ...valid, endYear: null, endMonth: 12 }).success,
    ).toBe(false);
  });

  it("should reject an end month set to null alongside a filled end year", () => {
    expect(
      createRecurringExpenseSchema.safeParse({ ...valid, endYear: 2026, endMonth: null }).success,
    ).toBe(false);
  });

  it.each([
    ["description", { description: "" }],
    ["amount", { amount: 0 }],
    ["amount", { amount: -1 }],
    ["categoryId", { categoryId: "" }],
    ["startYear", { startYear: 1999 }],
    ["startMonth", { startMonth: 13 }],
  ])("should reject an invalid %s", (_field, override) => {
    expect(createRecurringExpenseSchema.safeParse({ ...valid, ...override }).success).toBe(false);
  });
});

describe("updateRecurringExpenseSchema", () => {
  const competence = { effectiveYear: 2026, effectiveMonth: 5 };

  it("should accept a payload with only the description", () => {
    expect(
      updateRecurringExpenseSchema.safeParse({ ...competence, description: "Aluguel novo" })
        .success,
    ).toBe(true);
  });

  it("should accept a payload with only the amount", () => {
    expect(updateRecurringExpenseSchema.safeParse({ ...competence, amount: 2100 }).success).toBe(
      true,
    );
  });

  it("should accept a payload with only the category", () => {
    expect(
      updateRecurringExpenseSchema.safeParse({ ...competence, categoryId: "category-2" }).success,
    ).toBe(true);
  });

  it("should reject a payload with no editable field", () => {
    const result = updateRecurringExpenseSchema.safeParse(competence);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("At least one field must be provided");
  });

  // O refine de casas decimais usa `Number.isInteger(Math.round(value * 100))`, que é
  // sempre verdadeiro — a validação não rejeita nada hoje. Teste documenta o comportamento real.
  it("should currently accept an amount with more than two decimal places", () => {
    expect(
      updateRecurringExpenseSchema.safeParse({ ...competence, amount: 10.555 }).success,
    ).toBe(true);
  });

  it("should require the effective competence", () => {
    expect(updateRecurringExpenseSchema.safeParse({ amount: 2100 }).success).toBe(false);
  });
});
