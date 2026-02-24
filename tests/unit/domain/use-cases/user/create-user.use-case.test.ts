import { describe, it, expect, beforeEach } from "vitest";
import { CreateUserUseCase, EmailAlreadyExistsError } from "@src/domain/use-cases/user/create-user.use-case";
import { User } from "@src/domain/entities/user.entity";
import { UserRepository } from "@src/domain/ports/user.repository";

class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async create(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }
}

describe("CreateUserUseCase", () => {
  let repository: InMemoryUserRepository;
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new CreateUserUseCase(repository);
  });

  it("should create a user when valid input is provided", async () => {
    const user = await useCase.execute({ name: "João", email: "joao@example.com" });
    expect(user.id).toBeDefined();
    expect(user.name).toBe("João");
    expect(user.email).toBe("joao@example.com");
  });

  it("should persist the user in the repository when user is created", async () => {
    const user = await useCase.execute({ name: "João", email: "joao@example.com" });
    const found = await repository.findById(user.id);
    expect(found).not.toBeNull();
    expect(found!.email).toBe("joao@example.com");
  });

  it("should throw EmailAlreadyExistsError when email already exists", async () => {
    await useCase.execute({ name: "João", email: "joao@example.com" });
    await expect(useCase.execute({ name: "Maria", email: "joao@example.com" })).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  it("should throw EmailAlreadyExistsError when normalized email already exists", async () => {
    await useCase.execute({ name: "João", email: "JOAO@Example.COM" });
    await expect(useCase.execute({ name: "Maria", email: "joao@example.com" })).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });
});
