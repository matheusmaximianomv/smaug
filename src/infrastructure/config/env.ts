import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z
  .object({
    DATABASE_PROVIDER: z.enum(["postgresql", "sqlite", "memory"]),
    DATABASE_URL: z.string().min(1, "DATABASE_URL must not be empty"),
    NODE_ENV: z.enum(["development", "production", "test"]),
    PORT: z
      .string()
      .default("3000")
      .transform((val) => Number(val))
      .pipe(z.number().int().min(1).max(65535)),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  })
  .passthrough();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Environment validation failed:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type EnvConfig = typeof env;
