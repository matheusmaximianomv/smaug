import { User } from "@src/domain/entities/user.entity";
import { UserRepository } from "@src/domain/ports/user.repository";

export interface CreateUserInput {
  name: string;
  email: string;
}

export class CreateUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: CreateUserInput): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(input.email.trim().toLowerCase());
    if (existingUser) {
      throw new EmailAlreadyExistsError(input.email);
    }

    const user = User.create({
      name: input.name,
      email: input.email,
    });

    return this.userRepository.create(user);
  }
}

export class EmailAlreadyExistsError extends Error {
  constructor(email: string) {
    super(`A user with email "${email}" already exists`);
    this.name = "EmailAlreadyExistsError";
  }
}
