import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import type {
  PasswordHash,
  PasswordHasher,
  PasswordVerification,
} from "@src/domain/ports/password-hasher.ts";
import type { AuthConfig } from "@src/infrastructure/config/auth-config.ts";

export type Argon2PasswordHasherConfig = AuthConfig["password"];

/**
 * Argon2id com o pepper como `secret` (o K da RFC 9106): o PHC gravado não contém o pepper, e o
 * `pepperId` ao lado dele diz qual chave do chaveiro participou da derivação.
 */
export class Argon2PasswordHasher implements PasswordHasher {
  /**
   * Gerado no construtor com os parâmetros e o pepper vigentes, para custar o mesmo que um verify
   * real (RN-04) desde a primeira chamada; uma constante embutida ficaria defasada ao calibrar o
   * ARGON2_*.
   */
  private readonly dummyHash: Promise<string>;

  constructor(private readonly config: Argon2PasswordHasherConfig) {
    this.pepper(config.currentPepperId);
    this.dummyHash = this.hash(randomBytes(32).toString("base64url")).then(({ hash }) => hash);
  }

  async hash(password: string): Promise<PasswordHash> {
    const pepperId = this.config.currentPepperId;
    const hash = await argon2.hash(normalize(password), {
      type: argon2.argon2id,
      ...this.config.argon2,
      secret: this.pepper(pepperId),
    });
    return { hash, pepperId };
  }

  async verify(password: string, stored: PasswordHash): Promise<PasswordVerification> {
    const secret = this.pepper(stored.pepperId);
    const matches = await verifySafely(stored.hash, password, secret);
    if (!matches) return { matches: false, needsRehash: false };
    const needsRehash =
      stored.pepperId !== this.config.currentPepperId ||
      argon2.needsRehash(stored.hash, this.config.argon2);
    return { matches: true, needsRehash };
  }

  async verifyAgainstDummy(password: string): Promise<void> {
    await verifySafely(await this.dummyHash, password, this.pepper(this.config.currentPepperId));
  }

  /** `pepperId` fora do chaveiro é erro de configuração (500), não "senha errada". */
  private pepper(pepperId: string): Buffer {
    const secret = this.config.peppers.get(pepperId);
    if (secret === undefined) {
      throw new Error(`Password pepper "${pepperId}" is not in the keyring`);
    }
    return secret;
  }
}

/** Mesma senha digitada em teclados diferentes não pode gerar bytes diferentes. */
function normalize(password: string): string {
  return password.normalize("NFKC");
}

/** Hash corrompido no banco é "não confere", não uma exceção que vire 500 no login. */
async function verifySafely(digest: string, password: string, secret: Buffer): Promise<boolean> {
  try {
    return await argon2.verify(digest, normalize(password), { secret });
  } catch {
    return false;
  }
}
