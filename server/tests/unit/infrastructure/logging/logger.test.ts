import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

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
