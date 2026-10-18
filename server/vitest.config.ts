import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@src": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    // Segredos FIXOS de teste, sem valor nenhum fora daqui: o env.ts os exige no import e o CI
    // não tem server/.env. Os ARGON2_* mínimos NÃO entram aqui: há testes que importam o env.ts
    // com NODE_ENV=development, onde o piso da OWASP os recusaria; quem faz hash os fixa.
    env: {
      JWT_SECRET: "dGVzdC1vbmx5LWp3dC1zZWNyZXQtbm90LXNlY3JldCE=",
      JWT_KEY_ID: "test",
      PASSWORD_PEPPERS: "test:dGVzdC1vbmx5LXBlcHBlci1ub3QtYS1zZWNyZXQhISE=",
      PASSWORD_PEPPER_CURRENT_ID: "test",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/ports/**"],
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
