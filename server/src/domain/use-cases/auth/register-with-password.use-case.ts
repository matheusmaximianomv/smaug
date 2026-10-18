import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { EmailAlreadyExistsError } from "@src/domain/errors/domain-error";
import { PasswordHasher } from "@src/domain/ports/password-hasher";
import { UserRepository } from "@src/domain/ports/user.repository";
import { PasswordPolicy } from "@src/domain/value-objects/password-policy.value-object";
import { AuthEventLogger } from "@src/domain/ports/auth-event-logger";

export interface RegisterWithPasswordInput {
  name: string;
  email: string;
  password: string;
}

export class RegisterWithPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly logger: AuthEventLogger,
  ) {}

  public async execute(input: RegisterWithPasswordInput): Promise<User> {
    PasswordPolicy.assert(input.password);
    const user = User.create({ name: input.name, email: input.email });

    // Falha rápida antes de pagar o Argon2; a corrida entre dois cadastros é resolvida pelo
    // índice único, que o repositório traduz para o mesmo erro.
    const existingUser = await this.userRepository.findByEmail(user.email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(user.email);
    }

    const hash = await this.passwordHasher.hash(input.password);
    const credential = PasswordCredential.create({
      userId: user.id,
      passwordHash: hash.hash,
      pepperId: hash.pepperId,
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    });

    const created = await this.userRepository.createWithPasswordCredential(user, credential);
    this.logger.info("auth.register", { userId: created.id });
    return created;
  }
}
