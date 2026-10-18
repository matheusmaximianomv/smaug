import type { PasswordHash } from "@src/domain/ports/password-hasher";

export interface PasswordCredentialProps {
  userId: string;
  passwordHash: string;
  pepperId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class PasswordCredential {
  public readonly userId: string;
  public readonly passwordHash: string;
  public readonly pepperId: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(props: Required<PasswordCredentialProps>) {
    this.userId = props.userId;
    this.passwordHash = props.passwordHash;
    this.pepperId = props.pepperId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  public static create(props: PasswordCredentialProps): PasswordCredential {
    PasswordCredential.validatePasswordHash(props.passwordHash);
    PasswordCredential.validatePepperId(props.pepperId);

    const now = new Date();
    return new PasswordCredential({
      userId: props.userId,
      passwordHash: props.passwordHash,
      pepperId: props.pepperId,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  /** Rehash depois de um login: troca hash e pepper e preserva `createdAt`. */
  public withNewHash(hash: PasswordHash, now: Date): PasswordCredential {
    PasswordCredential.validatePasswordHash(hash.hash);
    PasswordCredential.validatePepperId(hash.pepperId);

    return new PasswordCredential({
      userId: this.userId,
      passwordHash: hash.hash,
      pepperId: hash.pepperId,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }

  private static validatePasswordHash(passwordHash: string): void {
    if (passwordHash.length === 0) {
      throw new Error("Password hash must not be empty");
    }
  }

  private static validatePepperId(pepperId: string): void {
    if (pepperId.length === 0) {
      throw new Error("Pepper id must not be empty");
    }
  }
}
