import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "integration",
    include: ["tests/integration/**/*.{test,spec}.{ts,tsx,js}"],
    exclude: ["tests/unit/**"],
    environment: "node",
    globals: true,
  },
});
