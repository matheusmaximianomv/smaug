import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const delegate = {
  findUnique: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const prismaClient: Record<string, unknown> = { user: delegate };

vi.mock("@src/infrastructure/database/config.ts", () => ({
  getPrismaClient: vi.fn(() => prismaClient),
}));

const originalEnv = { ...process.env };

async function importProvider(provider: string) {
  process.env = {
    ...originalEnv,
    DATABASE_PROVIDER: provider,
    DATABASE_URL: "file:./dev.db",
    NODE_ENV: "test",
    LOG_LEVEL: "error",
  };
  vi.resetModules();
  return import("@src/infrastructure/database/database.provider.ts");
}

/**
 * `env` é validado por Zod no import, então um provider inválido só é alcançável
 * substituindo o módulo de env — é o único caminho até o `default` do switch.
 */
async function importProviderBypassingEnvValidation(provider: string) {
  process.env = { ...originalEnv, NODE_ENV: "test" };
  vi.resetModules();
  vi.doMock("@src/infrastructure/config/env.ts", () => ({
    env: { DATABASE_PROVIDER: provider, DATABASE_URL: "file:./dev.db" },
  }));
  const module = await import("@src/infrastructure/database/database.provider.ts");
  vi.doUnmock("@src/infrastructure/config/env.ts");
  return module;
}

describe("getRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("should return an in-memory repository for the memory provider", async () => {
    const { getRepository } = await importProvider("memory");
    const { InMemoryRepository } = await import(
      "@src/infrastructure/database/repositories/in-memory.repository.ts"
    );

    await expect(getRepository()).resolves.toBeInstanceOf(InMemoryRepository);
  });

  it("should require a model name for the sqlite provider", async () => {
    const { getRepository } = await importProvider("sqlite");

    await expect(getRepository()).rejects.toThrow("Prisma repository requires a model name");
  });

  it("should require a model name for the postgresql provider", async () => {
    const { getRepository } = await importProvider("postgresql");

    await expect(getRepository()).rejects.toThrow("Prisma repository requires a model name");
  });

  it("should reject an unsupported provider", async () => {
    const { getRepository } = await importProviderBypassingEnvValidation("mongodb");

    await expect(getRepository("user")).rejects.toThrow(
      "Unsupported database provider: mongodb",
    );
  });

  describe("Prisma-backed repository", () => {
    it("should delegate every operation to the Prisma model", async () => {
      const { getRepository } = await importProvider("postgresql");
      const repository = await getRepository<{ id: string; name: string }>("user");
      const record = { id: "user-1", name: "Ana" };

      delegate.findUnique.mockResolvedValue(record);
      delegate.findMany.mockResolvedValue([record]);
      delegate.create.mockResolvedValue(record);
      delegate.update.mockResolvedValue(record);
      delegate.delete.mockResolvedValue(undefined);

      await expect(repository.findById("user-1")).resolves.toBe(record);
      expect(delegate.findUnique).toHaveBeenCalledWith({ where: { id: "user-1" } });

      await expect(repository.findAll()).resolves.toEqual([record]);

      await expect(repository.create(record)).resolves.toBe(record);
      expect(delegate.create).toHaveBeenCalledWith({ data: record });

      await expect(repository.update("user-1", { name: "Bia" })).resolves.toBe(record);
      expect(delegate.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { name: "Bia" },
      });

      await expect(repository.delete("user-1")).resolves.toBeUndefined();
      expect(delegate.delete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    });

    it("should fail when the Prisma model does not exist", async () => {
      const { getRepository } = await importProvider("sqlite");
      const repository = await getRepository("unknownModel");

      await expect(repository.findById("id")).rejects.toThrow(
        "Prisma model 'unknownModel' not found",
      );
    });
  });
});
