import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const prismaInstances: Array<{ $queryRaw: ReturnType<typeof vi.fn>; $disconnect: ReturnType<typeof vi.fn> }> = [];
const prismaOptions: unknown[] = [];

const PrismaClientMock = vi.fn(function (this: Record<string, unknown>, options: unknown) {
  prismaOptions.push(options);
  const instance = { $queryRaw: vi.fn(), $disconnect: vi.fn() };
  prismaInstances.push(instance);
  Object.assign(this, instance);
  return this;
});

vi.mock("@prisma/client", () => ({ PrismaClient: PrismaClientMock }));

const originalEnv = { ...process.env };

async function importConfig(provider: string, databaseUrl = "file:./dev.db") {
  process.env = {
    ...originalEnv,
    DATABASE_PROVIDER: provider,
    DATABASE_URL: databaseUrl,
    NODE_ENV: "test",
    LOG_LEVEL: "error",
  };
  vi.resetModules();
  return import("@src/infrastructure/database/config.ts");
}

describe("database config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaInstances.length = 0;
    prismaOptions.length = 0;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("should build the Prisma client once and reuse it", async () => {
    const { getPrismaClient } = await importConfig("sqlite");

    const first = getPrismaClient();
    const second = getPrismaClient();

    expect(first).toBe(second);
    expect(PrismaClientMock).toHaveBeenCalledTimes(1);
    expect(prismaOptions[0]).toEqual({ datasources: { db: { url: "file:./dev.db" } } });
  });

  it("should disconnect and allow a new client afterwards", async () => {
    const { getPrismaClient, disconnectDatabase } = await importConfig("sqlite");

    getPrismaClient();
    await disconnectDatabase();

    expect(prismaInstances[0].$disconnect).toHaveBeenCalledTimes(1);

    getPrismaClient();
    expect(PrismaClientMock).toHaveBeenCalledTimes(2);
  });

  it("should be a no-op when disconnecting without a client", async () => {
    const { disconnectDatabase } = await importConfig("sqlite");

    await disconnectDatabase();

    expect(PrismaClientMock).not.toHaveBeenCalled();
  });

  it("should report the memory provider as connected without touching Prisma", async () => {
    const { checkDatabaseConnection } = await importConfig("memory");

    await expect(checkDatabaseConnection()).resolves.toEqual({ status: "connected" });
    expect(PrismaClientMock).not.toHaveBeenCalled();
  });

  it("should report a reachable database as connected", async () => {
    const { getPrismaClient, checkDatabaseConnection } = await importConfig("sqlite");
    getPrismaClient();
    prismaInstances[0].$queryRaw.mockResolvedValue([{ "1": 1 }]);

    await expect(checkDatabaseConnection()).resolves.toEqual({ status: "connected" });
  });

  it("should redact the database URL from the reported error", async () => {
    const url = "postgresql://user:secret@localhost:5432/smaug";
    const { getPrismaClient, checkDatabaseConnection } = await importConfig("postgresql", url);
    getPrismaClient();
    prismaInstances[0].$queryRaw.mockRejectedValue(
      new Error(`Cannot reach ${url}\nsecond line with more detail`),
    );

    const result = await checkDatabaseConnection();

    expect(result.status).toBe("disconnected");
    expect(result.error).toBe("Cannot reach [redacted]");
  });

  it("should fall back to a generic message for non-Error rejections", async () => {
    const { getPrismaClient, checkDatabaseConnection } = await importConfig("sqlite");
    getPrismaClient();
    prismaInstances[0].$queryRaw.mockRejectedValue("connection dropped");

    await expect(checkDatabaseConnection()).resolves.toEqual({
      status: "disconnected",
      error: "Unknown database error",
    });
  });

  it("should expose the provider alongside the connection status", async () => {
    const { getDatabaseStatus } = await importConfig("memory");

    await expect(getDatabaseStatus()).resolves.toEqual({
      provider: "memory",
      status: "connected",
    });
  });
});
