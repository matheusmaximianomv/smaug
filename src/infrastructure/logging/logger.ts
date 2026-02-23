import pino, { LoggerOptions } from "pino";
import { env } from "../config/env.ts";
import { Logger } from "../../application/ports/logger.interface.ts";

const baseOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
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
