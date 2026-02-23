import { randomUUID } from "node:crypto";
import { Repository } from "../../../domain/ports/repository.interface.js";

export class InMemoryRepository<T, ID = string> implements Repository<T, ID> {
  private store = new Map<ID, T>();

  async findById(id: ID): Promise<T | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.store.values());
  }

  async create(entity: T): Promise<T> {
    const id = randomUUID() as unknown as ID;
    const entityWithId = { ...(entity as Record<string, unknown>), id } as T;
    this.store.set(id, entityWithId);
    return entityWithId;
  }

  async update(id: ID, entity: Partial<T>): Promise<T> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error("Entity not found");
    }
    const updated = {
      ...(existing as Record<string, unknown>),
      ...(entity as Record<string, unknown>),
    } as T;
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: ID): Promise<void> {
    this.store.delete(id);
  }
}
