import { describe, expect, it } from "vitest";
import { InMemoryRepository } from "@src/infrastructure/database/repositories/in-memory.repository.ts";

type Entity = { id?: string; name: string };

describe("InMemoryRepository", () => {
  it("performs CRUD operations", async () => {
    const repo = new InMemoryRepository<Entity>();

    const created = await repo.create({ name: "foo" });
    expect(created.id).toBeDefined();

    const found = await repo.findById(created.id!);
    expect(found?.name).toBe("foo");

    const all = await repo.findAll();
    expect(all).toHaveLength(1);

    const updated = await repo.update(created.id!, { name: "bar" });
    expect(updated.name).toBe("bar");

    await repo.delete(created.id!);
    const afterDelete = await repo.findById(created.id!);
    expect(afterDelete).toBeNull();
  });
});

describe("InMemoryRepository missing entities", () => {
  it("throws when updating an unknown id", async () => {
    const repo = new InMemoryRepository<Entity>();

    await expect(repo.update("missing", { name: "bar" })).rejects.toThrow("Entity not found");
  });

  it("is a no-op when deleting an unknown id", async () => {
    const repo = new InMemoryRepository<Entity>();

    await expect(repo.delete("missing")).resolves.toBeUndefined();
    await expect(repo.findAll()).resolves.toEqual([]);
  });
});
