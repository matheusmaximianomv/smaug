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
