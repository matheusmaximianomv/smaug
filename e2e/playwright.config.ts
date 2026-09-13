import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(E2E_DIR, "..");

// Portas dedicadas: nunca colidem com o `npm run dev` (3000/3001), então é
// impossível um teste acabar batendo no dev.db por engano.
const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3101);
const API_URL = `http://localhost:${API_PORT}`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

// Definido por scripts/run-e2e.mjs. O fallback só existe para `npx playwright
// test` solto (IDE) e aponta para um arquivo estável, nunca para o dev.db.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `file:${path.join(E2E_DIR, ".tmp", "smaug-e2e-local.db")}`;

const WEB_MODE = process.env.E2E_WEB_MODE ?? (process.env.CI ? "build" : "dev");

// As seis variáveis são explícitas porque server/.env É lido (dotenv não
// sobrescreve o que já está no process.env, mas ausência aqui viraria o valor
// do .env de desenvolvimento).
const serverEnv = {
  NODE_ENV: "test",
  DATABASE_PROVIDER: "sqlite",
  DATABASE_URL,
  PORT: String(API_PORT),
  LOG_LEVEL: "error",
  // Precisa ser string IDÊNTICA ao Origin do browser: cors() com origem string
  // faz comparação exata. Por isso "localhost" em toda a config, nunca 127.0.0.1.
  CORS_ORIGIN: WEB_URL,
};

export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  globalTimeout: 20 * 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  globalSetup: "./src/global-setup.ts",
  globalTeardown: "./src/global-teardown.ts",

  use: {
    baseURL: WEB_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 45_000, // `next dev` compila sob demanda
    locale: "pt-BR",
    // Alinha o relógio do browser ao UTC que MonthlyCompetence.isPastMonth() usa
    // no domínio (getUTC*), enquanto o front usa getMonth() local. Numa TZ
    // negativa isso divergiria na virada do mês.
    timezoneId: "UTC",
    testIdAttribute: "data-testid",
  },

  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
      testIgnore: "**/*.mobile.spec.ts",
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"] }, // 393×851 → aciona o breakpoint ≤768px
      testMatch: "**/*.mobile.spec.ts",
    },
    ...(process.env.E2E_ALL_BROWSERS
      ? [
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testIgnore: "**/*.mobile.spec.ts",
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testIgnore: "**/*.mobile.spec.ts",
          },
        ]
      : []),
  ],

  webServer: [
    {
      command: "npx tsx src/main.ts",
      cwd: path.join(ROOT, "server"),
      url: `${API_URL}/health`, // 200 só quando o SELECT 1 passa
      env: serverEnv,
      reuseExistingServer: false, // NUNCA reaproveitar: poderia ser o dev.db
      timeout: 60_000,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command:
        WEB_MODE === "build" ? `npx next start -p ${WEB_PORT}` : `npx next dev -p ${WEB_PORT}`,
      cwd: path.join(ROOT, "web"),
      url: `${WEB_URL}/login`,
      // Sem NODE_ENV aqui: `next dev` exige development e `next start` seta
      // production sozinho.
      env: { NEXT_PUBLIC_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
