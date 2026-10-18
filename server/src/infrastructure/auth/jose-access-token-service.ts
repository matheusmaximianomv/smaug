import { randomUUID } from "node:crypto";
import { jwtVerify, SignJWT, type JWTHeaderParameters } from "jose";
import type {
  AccessTokenClaims,
  AccessTokenService,
  IssuedAccessToken,
} from "@src/domain/ports/access-token-service.ts";
import type { AuthConfig } from "@src/infrastructure/config/auth-config.ts";

export type JoseAccessTokenServiceConfig = AuthConfig["accessToken"];

const ALGORITHM = "HS256";
/** RFC 9068: outro JWT assinado com a mesma chave não passa por access token. */
const TOKEN_TYPE = "at+jwt";
const REQUIRED_CLAIMS = ["sub", "sid", "jti", "iat", "exp"];
const CLOCK_TOLERANCE_SECONDS = 5;

export class JoseAccessTokenService implements AccessTokenService {
  constructor(private readonly config: JoseAccessTokenServiceConfig) {}

  async issue(claims: AccessTokenClaims): Promise<IssuedAccessToken> {
    const { currentKey, issuer, audience, ttlSeconds } = this.config;
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + ttlSeconds;
    // Só identificadores: o JWT é codificado, não cifrado, e nenhum dado de perfil entra nele.
    const token = await new SignJWT({ sid: claims.sessionId })
      .setProtectedHeader({ alg: ALGORITHM, typ: TOKEN_TYPE, kid: currentKey.id })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject(claims.userId)
      .setJti(randomUUID())
      .setIssuedAt(issuedAt)
      .setExpirationTime(expiresAt)
      .sign(currentKey.secret);
    return { token, expiresAt: new Date(expiresAt * 1000) };
  }

  async verify(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, (header) => this.keyFor(header), {
        algorithms: [ALGORITHM],
        issuer: this.config.issuer,
        audience: this.config.audience,
        typ: TOKEN_TYPE,
        requiredClaims: REQUIRED_CLAIMS,
        clockTolerance: CLOCK_TOLERANCE_SECONDS,
      });
      if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }

  /** A chave anterior só verifica (rotação sem derrubar quem está logado); `kid` desconhecido é inválido. */
  private keyFor(header: JWTHeaderParameters): Buffer {
    const { currentKey, previousKey } = this.config;
    if (header.kid === currentKey.id) return currentKey.secret;
    if (previousKey !== null && header.kid === previousKey.id) return previousKey.secret;
    throw new Error("Unknown access token key id");
  }
}
