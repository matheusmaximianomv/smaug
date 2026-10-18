import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores(["coverage/**"]),
  // Absoluto: o lint-staged chama o ESLint a partir da raiz do repo, onde não há pages/.
  { settings: { next: { rootDir: import.meta.dirname } } },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "tests/**/*.ts", "tests/**/*.tsx", "vitest.setup.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
]);
