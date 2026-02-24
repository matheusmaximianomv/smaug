import { User } from "@src/domain/entities/user.entity";
import { UserRepository } from "@src/domain/ports/user.repository";

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }
}

export class UserNotFoundError extends Error {
  constructor(id: string) {
    super(`User with id "${id}" not found`);
    this.name = "UserNotFoundError";
  }
}
