import { PasswordCredential } from "@src/domain/entities/password-credential.entity";

export interface PasswordCredentialRepository {
  findByUserId(userId: string): Promise<PasswordCredential | null>;
  update(credential: PasswordCredential): Promise<PasswordCredential>;
}
