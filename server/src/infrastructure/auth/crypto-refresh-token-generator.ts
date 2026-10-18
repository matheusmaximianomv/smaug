import { createHash, randomBytes } from "node:crypto";
import type {
  GeneratedRefreshToken,
  RefreshTokenGenerator,
} from "@src/domain/ports/refresh-token-generator.ts";

const TOKEN_BYTES = 32;

/**
 * Refresh opaco: o banco guarda só o SHA-256 e busca por igualdade de hash. Sem salt nem custo
 * porque o token já tem 256 bits de entropia — não há dicionário a atacar, ao contrário da senha.
 */
export class CryptoRefreshTokenGenerator implements RefreshTokenGenerator {
  generate(): GeneratedRefreshToken {
    const plain = randomBytes(TOKEN_BYTES).toString("base64url");
    return { plain, hash: this.hash(plain) };
  }

  hash(plain: string): string {
    return createHash("sha256").update(plain).digest("hex");
  }
}
