import { describe, it, expect, beforeEach } from "vitest";
import { GetUserUseCase, UserNotFoundError } from "@src/domain/use-cases/user/get-user.use-case";
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

describe("GetUserUseCase", () => {
  let repository: InMemoryUserRepository;
  let useCase: GetUserUseCase;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    useCase = new GetUserUseCase(repository);
  });

  it("should return user when found", async () => {
    const created = User.create({ name: "João", email: "joao@example.com" });
    await repository.create(created);

    const found = await useCase.execute(created.id);
    expect(found.id).toBe(created.id);
    expect(found.name).toBe("João");
  });

  it("should throw UserNotFoundError when user does not exist", async () => {
    await expect(useCase.execute("non-existent-id")).rejects.toThrow(UserNotFoundError);
  });
});
