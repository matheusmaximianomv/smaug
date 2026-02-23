import { describe, expect, it, vi, afterEach } from "vitest";

async function importEnvModule() {
  return import("../../../../src/infrastructure/config/env.ts");
}

describe("env config validation", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads valid environment", async () => {
    process.env.DATABASE_PROVIDER = "memory";
    process.env.DATABASE_URL = "file:./dev.db";
    process.env.NODE_ENV = "development";
    process.env.PORT = "3001";
    process.env.LOG_LEVEL = "debug";

    const mod = await importEnvModule();
    expect(mod.env.DATABASE_PROVIDER).toBe("memory");
    expect(mod.env.PORT).toBe(3001);
  });

  it("fails fast on invalid environment", async () => {
    process.env = { ...original, DATABASE_PROVIDER: "invalid", DATABASE_URL: "", NODE_ENV: "dev" };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(importEnvModule()).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });
});
