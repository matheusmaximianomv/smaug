import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";
import { InvalidCredentialsError } from "@src/domain/errors/domain-error";
import { PasswordCredentialRepository } from "@src/domain/ports/password-credential.repository";
import { PasswordHasher } from "@src/domain/ports/password-hasher";
import { UserRepository } from "@src/domain/ports/user.repository";
import { EmailAddress } from "@src/domain/value-objects/email-address.value-object";
import { AuthEventLogger } from "@src/domain/ports/auth-event-logger";

export interface LoginWithPasswordInput {
  email: string;
  password: string;
}

/**
 * Prova a identidade por e-mail e senha e devolve o usuário (o service abre a sessão e usa o
 * perfil na resposta). Todo caminho executa exatamente um Argon2 — `verify` ou
 * `verifyAgainstDummy` — e todo fracasso é o mesmo `InvalidCredentialsError` (RN-04).
 */
export class LoginWithPasswordUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly credentialRepository: PasswordCredentialRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly logger: AuthEventLogger,
  ) {}

  public async execute(input: LoginWithPasswordInput): Promise<User> {
    const email = EmailAddress.create(input.email);
    const user = await this.userRepository.findByEmail(email.value);
    const credential = user ? await this.credentialRepository.findByUserId(user.id) : null;

    if (!user || !credential) {
      await this.passwordHasher.verifyAgainstDummy(input.password);
      this.logger.info("auth.login.failed", user ? { userId: user.id } : {});
      throw new InvalidCredentialsError();
    }

    const verification = await this.passwordHasher.verify(input.password, {
      hash: credential.passwordHash,
      pepperId: credential.pepperId,
    });
    if (!verification.matches) {
      this.logger.info("auth.login.failed", { userId: user.id });
      throw new InvalidCredentialsError();
    }

    if (verification.needsRehash) {
      await this.rehash(credential, input.password);
    }

    this.logger.info("auth.login.succeeded", { userId: user.id, authMethod: "password" });
    return user;
  }

  /** A senha só é conhecida agora; se a regravação falhar, o login segue e a falha fica no log. */
  private async rehash(credential: PasswordCredential, password: string): Promise<void> {
    try {
      const hash = await this.passwordHasher.hash(password);
      await this.credentialRepository.update(credential.withNewHash(hash, new Date()));
      this.logger.info("auth.password.rehashed", {
        userId: credential.userId,
        pepperId: hash.pepperId,
      });
    } catch (error) {
      this.logger.error("auth.password.rehash_failed", {
        userId: credential.userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
