import path from "node:path";
import { fileURLToPath } from "node:url";

export const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ROOT = path.resolve(E2E_DIR, "..");

export const API_PORT = Number(process.env.E2E_API_PORT ?? 3100);
export const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3101);
export const API_URL = `http://localhost:${API_PORT}`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

export const DB_FILE = process.env.E2E_DB_FILE ?? path.join(E2E_DIR, ".tmp", "smaug-e2e-local.db");

export const WEB_MODE = process.env.E2E_WEB_MODE ?? (process.env.CI ? "build" : "dev");
export const MANAGED_BY_WRAPPER = !!process.env.E2E_MANAGED_BY_WRAPPER;

/** Rotas protegidas, usadas pelo warm-up e pelos testes de guarda. */
export const APP_ROUTES = [
  "/dashboard",
  "/receitas",
  "/despesas",
  "/categorias",
  "/historico",
] as const;

export const PUBLIC_ROUTES = ["/login", "/cadastro"] as const;
