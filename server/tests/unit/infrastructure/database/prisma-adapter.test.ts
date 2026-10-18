import { describe, it, expect, beforeEach, vi } from "vitest";

const PrismaPgMock = vi.fn(function (this: Record<string, unknown>, ...args: unknown[]) {
  this.args = args;
  return this;
});
const PrismaBetterSqlite3Mock = vi.fn(function (this: Record<string, unknown>, ...args: unknown[]) {
  this.args = args;
  return this;
});

vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: PrismaPgMock }));
vi.mock("@prisma/adapter-better-sqlite3", () => ({ PrismaBetterSqlite3: PrismaBetterSqlite3Mock }));

const { createPrismaAdapter } = await import("@src/infrastructure/database/prisma-adapter.ts");

describe("createPrismaAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should build the pg adapter with a 5 second connection timeout for postgresql", () => {
    const url = "postgresql://user:secret@localhost:5432/smaug";

    const adapter = createPrismaAdapter("postgresql", url);

    expect(adapter).toBeInstanceOf(PrismaPgMock);
    expect(PrismaPgMock).toHaveBeenCalledWith({
      connectionString: url,
      connectionTimeoutMillis: 5_000,
    });
    expect(PrismaBetterSqlite3Mock).not.toHaveBeenCalled();
  });

  it("should build the better-sqlite3 adapter with millisecond timestamps for sqlite", () => {
    const url = "file:/tmp/smaug.db";

    const adapter = createPrismaAdapter("sqlite", url);

    expect(adapter).toBeInstanceOf(PrismaBetterSqlite3Mock);
    expect(PrismaBetterSqlite3Mock).toHaveBeenCalledWith(
      { url },
      { timestampFormat: "unixepoch-ms" },
    );
    expect(PrismaPgMock).not.toHaveBeenCalled();
  });
});
