import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalEnv = { ...process.env };

describe("dependency container", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_PROVIDER: "memory",
      DATABASE_URL: "file:./dev.db",
      NODE_ENV: "test",
      LOG_LEVEL: "error",
    };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("should register the Logger and export every wired controller", async () => {
    const module = await import("@src/infrastructure/config/container.ts");

    expect(module.container.resolve("Logger")).toBeDefined();

    const controllers = [
      "userController",
      "oneTimeRevenueController",
      "fixedRevenueController",
      "revenueQueryController",
      "expenseCategoryController",
      "oneTimeExpenseController",
      "installmentExpenseController",
      "recurringExpenseController",
      "expenseQueryController",
    ] as const;

    for (const name of controllers) {
      expect(module[name], `${name} deve ser exportado pelo container`).toBeDefined();
    }
  });
});
