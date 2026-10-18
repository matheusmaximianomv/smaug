import dotenv from "dotenv";
import { z } from "zod";
import { resolveSqliteUrl } from "@src/infrastructure/config/sqlite-url.ts";
import {
  base64SecretSchema,
  booleanFlagSchema,
  buildAuthConfig,
  checkAuthEnv,
  keyIdSchema,
  nonNegativeIntSchema,
  pepperKeyringSchema,
  positiveIntSchema,
  trustProxySchema,
} from "@src/infrastructure/config/auth-config.ts";

dotenv.config();

const envSchema = z
  .object({
    DATABASE_PROVIDER: z.enum(["postgresql", "sqlite", "memory"]),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL must not be empty")
      .transform((url) => resolveSqliteUrl(url)),
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z
      .string()
      .default("3000")
      .transform((val) => Number(val))
      .pipe(z.number().int().min(1).max(65535)),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    // Sem barra final: o navegador manda `Origin` sem ela, e o CORS e o requireTrustedOrigin
    // comparam a string exata.
    CORS_ORIGIN: z
      .string()
      .default("http://localhost:3001")
      .transform((origin) => origin.replace(/\/+$/, "")),
    JWT_SECRET: base64SecretSchema,
    JWT_KEY_ID: keyIdSchema,
    JWT_PREVIOUS_SECRET: base64SecretSchema.optional(),
    JWT_PREVIOUS_KEY_ID: keyIdSchema.optional(),
    JWT_ISSUER: z.string().min(1).default("smaug-api"),
    JWT_AUDIENCE: z.string().min(1).default("smaug-web"),
    ACCESS_TOKEN_TTL_SECONDS: positiveIntSchema.default(600),
    REFRESH_TOKEN_TTL_SECONDS: positiveIntSchema.default(604800),
    SESSION_MAX_LIFETIME_SECONDS: positiveIntSchema.default(2592000),
    REFRESH_REUSE_GRACE_SECONDS: nonNegativeIntSchema.default(30),
    PASSWORD_PEPPERS: pepperKeyringSchema,
    PASSWORD_PEPPER_CURRENT_ID: keyIdSchema,
    ARGON2_MEMORY_KIB: positiveIntSchema.default(65536),
    ARGON2_TIME_COST: positiveIntSchema.default(3),
    ARGON2_PARALLELISM: positiveIntSchema.default(4),
    AUTH_COOKIE_SECURE: booleanFlagSchema.optional(),
    AUTH_COOKIE_PATH: z.string().startsWith("/").default("/api/auth"),
    TRUST_PROXY: trustProxySchema.optional(),
    // Tentativas por janela fixa (cadastro 1 h, login 15 min, refresh 1 min).
    AUTH_RATE_LIMIT_REGISTER_PER_IP: positiveIntSchema.default(10),
    AUTH_RATE_LIMIT_LOGIN_PER_IP: positiveIntSchema.default(50),
    AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: positiveIntSchema.default(10),
    AUTH_RATE_LIMIT_REFRESH_PER_IP: positiveIntSchema.default(60),
  })
  .passthrough()
  .superRefine(checkAuthEnv);

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment validation failed:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type EnvConfig = typeof env;

export const authConfig = buildAuthConfig(env);
