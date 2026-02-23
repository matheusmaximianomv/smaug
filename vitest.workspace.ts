import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      include: ["tests/unit/**/*.{test,spec}.{ts,tsx,js}"],
      exclude: ["tests/integration/**"],
      environment: "node",
      globals: true,
    },
  },
  {
    test: {
      name: "integration",
      include: ["tests/integration/**/*.{test,spec}.{ts,tsx,js}"],
      exclude: ["tests/unit/**"],
      environment: "node",
      globals: true,
    },
  },
]);
