import { describe, expect, it, vi, afterEach } from "vitest";

async function importEnvModule() {
  return import("@src/infrastructure/config/env.ts");
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

  it("resolves a relative SQLite path from the working directory, not from the schema folder", async () => {
    process.env.DATABASE_PROVIDER = "sqlite";
    process.env.DATABASE_URL = "file:./prisma/sqlite/dev.db";
    process.env.NODE_ENV = "development";

    const mod = await importEnvModule();
    expect(mod.env.DATABASE_URL).toBe(`file:${process.cwd()}/prisma/sqlite/dev.db`);
  });
});

describe("resolveSqliteUrl", () => {
  it("should make a relative path absolute from the base directory, keeping the query", async () => {
    const { resolveSqliteUrl } = await importEnvModule();
    expect(resolveSqliteUrl("file:./dev.db?connection_limit=1", "/srv/server")).toBe(
      "file:/srv/server/dev.db?connection_limit=1",
    );
  });

  it("should keep an absolute SQLite path untouched", async () => {
    const { resolveSqliteUrl } = await importEnvModule();
    expect(resolveSqliteUrl("file:/tmp/e2e.db", "/srv/server")).toBe("file:/tmp/e2e.db");
  });

  it("should keep a non-SQLite URL untouched", async () => {
    const { resolveSqliteUrl } = await importEnvModule();
    const url = "postgresql://postgres:postgres@localhost:5432/smaug?schema=public";
    expect(resolveSqliteUrl(url, "/srv/server")).toBe(url);
  });
});
