import { describe, it, expect } from "vitest";
import { updateInstallmentExpenseSchema } from "@src/application/dtos/installment-expense.dto";

describe("updateInstallmentExpenseSchema", () => {
  it("should accept a payload with only the description", () => {
    expect(updateInstallmentExpenseSchema.safeParse({ description: "Notebook novo" }).success).toBe(
      true,
    );
  });

  it("should accept a payload with only the category", () => {
    expect(updateInstallmentExpenseSchema.safeParse({ categoryId: "category-2" }).success).toBe(
      true,
    );
  });

  it("should reject an empty payload", () => {
    const result = updateInstallmentExpenseSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("At least one field must be provided");
  });

  it("should reject an empty description", () => {
    expect(updateInstallmentExpenseSchema.safeParse({ description: "" }).success).toBe(false);
  });
});
