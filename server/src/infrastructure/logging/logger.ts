import pino, { LoggerOptions } from "pino";
import { env } from "@src/infrastructure/config/env.ts";
import { Logger } from "@src/application/ports/logger.interface.ts";

/**
 * Defesa em profundidade (§14): nenhum log recebe segredo de propósito, mas um
 * `logger.error(…, { body })` ou `{ headers }` futuro não pode vazar senha, token ou cookie.
 */
const SENSITIVE_KEYS = [
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  '["set-cookie"]',
  "secret",
  "pepper",
];

export const REDACTED_PATHS = SENSITIVE_KEYS.flatMap((key) => [
  key,
  key.startsWith("[") ? `*${key}` : `*.${key}`,
]);

const baseOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: { paths: REDACTED_PATHS, censor: "[REDACTED]" },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
};

const pinoLogger = pino(baseOptions);

export class PinoLogger implements Logger {
  info(message: string, context?: Record<string, unknown>): void {
    pinoLogger.info(context ?? {}, message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    pinoLogger.warn(context ?? {}, message);
  }

  error(message: string, context?: Record<string, unknown>): void {
    pinoLogger.error(context ?? {}, message);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    pinoLogger.debug(context ?? {}, message);
  }
}
