import { User } from "@src/domain/entities/user.entity";
import { PasswordCredential } from "@src/domain/entities/password-credential.entity";

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  /** Usuário e credencial na mesma transação; e-mail duplicado (inclusive em corrida) lança EmailAlreadyExistsError. */
  createWithPasswordCredential(user: User, credential: PasswordCredential): Promise<User>;
}
