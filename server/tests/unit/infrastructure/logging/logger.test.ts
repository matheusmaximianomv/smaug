import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { LoggerOptions } from "pino";

const pinoLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const pinoFactory = vi.fn(() => pinoLogger);

vi.mock("pino", () => ({ default: pinoFactory }));

const originalEnv = { ...process.env };

async function importLogger(nodeEnv: string) {
  process.env = {
    ...originalEnv,
    DATABASE_PROVIDER: "memory",
    DATABASE_URL: "file:./dev.db",
    NODE_ENV: nodeEnv,
    LOG_LEVEL: "debug",
  };
  vi.resetModules();
  return import("@src/infrastructure/logging/logger.ts");
}

describe("PinoLogger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("should enable the pino-pretty transport in development", async () => {
    await importLogger("development");

    expect(pinoFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        level: "debug",
        transport: { target: "pino-pretty", options: { colorize: true } },
      }),
    );
  });

  it("should leave the transport undefined outside development", async () => {
    await importLogger("test");

    expect(pinoFactory).toHaveBeenCalledWith(
      expect.objectContaining({ level: "debug", transport: undefined }),
    );
  });

  it("should mask passwords, tokens, cookies, secrets, peppers and the Authorization header", async () => {
    await importLogger("test");
    const [options] = pinoFactory.mock.calls[0] as unknown as [LoggerOptions];
    const { pino: realPino } = await vi.importActual<typeof import("pino")>("pino");
    const lines: string[] = [];
    const logger = realPino(options, { write: (line: string) => lines.push(line) });

    logger.info(
      {
        password: "s3cret-password",
        passwordHash: "$argon2id$hash",
        accessToken: "access.jwt",
        refreshToken: "refresh-opaque",
        "set-cookie": "smaug_refresh=a",
        headers: { authorization: "Bearer x", cookie: "smaug_refresh=b", "set-cookie": "c" },
        body: { password: "s3cret-body", refreshToken: "r", accessToken: "a" },
        secret: "s3cret-jwt-key",
        pepper: "s3cret-pepper",
        config: { secret: "s3cret-nested-key", pepper: "s3cret-nested-pepper" },
        userId: "user-1",
      },
      "with secrets",
    );

    const entry = JSON.parse(lines[0] as string);
    expect(lines[0]).not.toMatch(/s3cret|access\.jwt|refresh-opaque|smaug_refresh|Bearer|argon2id/);
    expect(entry.password).toBe("[REDACTED]");
    expect(entry.headers).toEqual({
      authorization: "[REDACTED]",
      cookie: "[REDACTED]",
      "set-cookie": "[REDACTED]",
    });
    expect(entry.body.password).toBe("[REDACTED]");
    expect(entry.secret).toBe("[REDACTED]");
    expect(entry.pepper).toBe("[REDACTED]");
    expect(entry.config).toEqual({ secret: "[REDACTED]", pepper: "[REDACTED]" });
    expect(entry.userId).toBe("user-1");
  });

  it("should forward every level with the provided context", async () => {
    const { PinoLogger } = await importLogger("test");
    const logger = new PinoLogger();
    const context = { userId: "user-1" };

    logger.info("info message", context);
    logger.warn("warn message", context);
    logger.error("error message", context);
    logger.debug("debug message", context);

    expect(pinoLogger.info).toHaveBeenCalledWith(context, "info message");
    expect(pinoLogger.warn).toHaveBeenCalledWith(context, "warn message");
    expect(pinoLogger.error).toHaveBeenCalledWith(context, "error message");
    expect(pinoLogger.debug).toHaveBeenCalledWith(context, "debug message");
  });

  it("should default the context to an empty object", async () => {
    const { PinoLogger } = await importLogger("test");
    const logger = new PinoLogger();

    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");
    logger.debug("debug message");

    expect(pinoLogger.info).toHaveBeenCalledWith({}, "info message");
    expect(pinoLogger.warn).toHaveBeenCalledWith({}, "warn message");
    expect(pinoLogger.error).toHaveBeenCalledWith({}, "error message");
    expect(pinoLogger.debug).toHaveBeenCalledWith({}, "debug message");
  });
});
