import { User } from "@src/domain/entities/user.entity";
import { UserRepository } from "@src/domain/ports/user.repository";
import { DomainError } from "@src/domain/errors/domain-error";

export class GetUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new UserNotFoundError(id);
    }
    return user;
  }
}

export class UserNotFoundError extends DomainError {
  public readonly code = "USER_NOT_FOUND";

  constructor(id: string) {
    super(`User with id "${id}" not found`);
    this.name = "UserNotFoundError";
  }
}
