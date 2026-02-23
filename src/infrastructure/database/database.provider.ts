import { PrismaClient } from "@prisma/client";
import { Repository } from "../../domain/ports/repository.interface.ts";
import { env } from "../config/env.ts";
import { getPrismaClient } from "./config.ts";
import { InMemoryRepository } from "./repositories/in-memory.repository.ts";

type PrismaModelDelegate<T> = {
  findUnique(args: { where: { id: string } }): Promise<T | null>;
  findMany(): Promise<T[]>;
  create(args: { data: T }): Promise<T>;
  update(args: { where: { id: string }; data: Partial<T> }): Promise<T>;
  delete(args: { where: { id: string } }): Promise<void>;
};

class PrismaRepository<T> implements Repository<T> {
  constructor(
    private readonly client: PrismaClient,
    private readonly modelName: string,
  ) {}

  private get delegate(): PrismaModelDelegate<T> {
    const delegate = (this.client as unknown as Record<string, PrismaModelDelegate<T> | undefined>)[
      this.modelName
    ];
    if (!delegate) {
      throw new Error(`Prisma model '${this.modelName}' not found`);
    }
    return delegate;
  }

  async findById(id: string): Promise<T | null> {
    return this.delegate.findUnique({ where: { id } });
  }

  async findAll(): Promise<T[]> {
    return this.delegate.findMany();
  }

  async create(entity: T): Promise<T> {
    return this.delegate.create({ data: entity });
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    return this.delegate.update({ where: { id }, data: entity });
  }

  async delete(id: string): Promise<void> {
    await this.delegate.delete({ where: { id } });
  }
}

export type RepositoryFactory = <T>(modelName?: string) => Promise<Repository<T>>;

export const getRepository: RepositoryFactory = async <T>(modelName?: string) => {
  switch (env.DATABASE_PROVIDER) {
    case "memory":
      return new InMemoryRepository<T>();
    case "sqlite":
    case "postgresql": {
      if (!modelName) {
        throw new Error("Prisma repository requires a model name");
      }
      const client = getPrismaClient();
      return new PrismaRepository<T>(client, modelName);
    }
    default:
      throw new Error(`Unsupported database provider: ${env.DATABASE_PROVIDER}`);
  }
};
