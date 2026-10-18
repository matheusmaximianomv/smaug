import { describe, it, expect, vi, afterEach } from "vitest";
import { decodeJwt, decodeProtectedHeader, exportJWK, generateKeyPair, SignJWT } from "jose";
import {
  JoseAccessTokenService,
  type JoseAccessTokenServiceConfig,
} from "@src/infrastructure/auth/jose-access-token-service.ts";

const CURRENT_KEY = { id: "2026-10", secret: Buffer.alloc(32, 7) };
const PREVIOUS_KEY = { id: "2026-09", secret: Buffer.alloc(32, 8) };
const OTHER_SECRET = Buffer.alloc(32, 9);
const CLAIMS = {
  userId: "6f1c1f0e-1d7a-4b7e-9a35-0d6b2f5c9a11",
  sessionId: "c0a8012e-7c1b-4f0e-8b1a-2a3b4c5d6e7f",
};
const NOW = new Date("2026-10-18T12:00:00.000Z");
const NOW_SECONDS = NOW.getTime() / 1000;

function makeConfig(
  overrides: Partial<JoseAccessTokenServiceConfig> = {},
): JoseAccessTokenServiceConfig {
  return {
    currentKey: CURRENT_KEY,
    previousKey: PREVIOUS_KEY,
    issuer: "smaug-api",
    audience: "smaug-web",
    ttlSeconds: 600,
    ...overrides,
  };
}

interface ForgeOptions {
  header?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  secret?: Uint8Array;
}

/** JWT montado à mão, válido em tudo menos no que o teste sobrescreve. */
function forge({
  header = {},
  payload = {},
  secret = CURRENT_KEY.secret,
}: ForgeOptions = {}): Promise<string> {
  return new SignJWT({
    iss: "smaug-api",
    aud: "smaug-web",
    sub: CLAIMS.userId,
    sid: CLAIMS.sessionId,
    jti: "4a2b6c8d-0e1f-4a3b-8c5d-6e7f8a9b0c1d",
    iat: NOW_SECONDS,
    exp: NOW_SECONDS + 600,
    ...payload,
  })
    .setProtectedHeader({ alg: "HS256", typ: "at+jwt", kid: CURRENT_KEY.id, ...header } as never)
    .sign(secret);
}

function encodeSegment(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

describe("JoseAccessTokenService", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should issue a token that verifies back to the same claims", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    const issued = await service.issue(CLAIMS);

    expect(issued.expiresAt).toEqual(new Date(NOW.getTime() + 600_000));
    await expect(service.verify(issued.token)).resolves.toEqual(CLAIMS);
  });

  it("should sign with HS256, at+jwt and the current key id", async () => {
    const service = new JoseAccessTokenService(makeConfig());

    const { token } = await service.issue(CLAIMS);

    expect(decodeProtectedHeader(token)).toEqual({ alg: "HS256", typ: "at+jwt", kid: "2026-10" });
  });

  it("should carry only identifiers in the payload, without any profile data", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    const { token } = await service.issue(CLAIMS);
    const payload = decodeJwt(token);

    expect(Object.keys(payload).sort()).toEqual(["aud", "exp", "iat", "iss", "jti", "sid", "sub"]);
    expect(payload).toMatchObject({
      iss: "smaug-api",
      aud: "smaug-web",
      sub: CLAIMS.userId,
      sid: CLAIMS.sessionId,
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 600,
    });
    expect(payload.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("should give every token its own jti", async () => {
    const service = new JoseAccessTokenService(makeConfig());

    const first = decodeJwt((await service.issue(CLAIMS)).token);
    const second = decodeJwt((await service.issue(CLAIMS)).token);

    expect(first.jti).not.toBe(second.jti);
  });

  it("should still accept a token within the 5 second clock tolerance after expiry", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());
    const { token } = await service.issue(CLAIMS);

    vi.setSystemTime(NOW.getTime() + 604_000);

    await expect(service.verify(token)).resolves.toEqual(CLAIMS);
  });

  it("should reject an expired token", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());
    const { token } = await service.issue(CLAIMS);

    vi.setSystemTime(NOW.getTime() + 606_000);

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it("should reject a token signed with another key under the current key id", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ secret: OTHER_SECRET }))).resolves.toBeNull();
  });

  it("should reject an unsigned token with alg none", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());
    const header = encodeSegment({ alg: "none", typ: "at+jwt", kid: CURRENT_KEY.id });
    const payload = encodeSegment({
      iss: "smaug-api",
      aud: "smaug-web",
      sub: CLAIMS.userId,
      sid: CLAIMS.sessionId,
      jti: "x",
      iat: NOW_SECONDS,
      exp: NOW_SECONDS + 600,
    });

    await expect(service.verify(`${header}.${payload}.`)).resolves.toBeNull();
  });

  it("should reject an HS512 token even when signed with the current secret", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ header: { alg: "HS512" } }))).resolves.toBeNull();
  });

  it("should reject an RS256 token", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const token = await new SignJWT({ sid: CLAIMS.sessionId })
      .setProtectedHeader({
        alg: "RS256",
        typ: "at+jwt",
        kid: CURRENT_KEY.id,
        jwk: await exportJWK(publicKey),
      })
      .setIssuer("smaug-api")
      .setAudience("smaug-web")
      .setSubject(CLAIMS.userId)
      .setJti("x")
      .setIssuedAt()
      .setExpirationTime("10m")
      .sign(privateKey);

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it("should reject a JWT whose typ is not at+jwt", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ header: { typ: "JWT" } }))).resolves.toBeNull();
  });

  it("should reject a token from another issuer", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ payload: { iss: "evil" } }))).resolves.toBeNull();
  });

  it("should reject a token for another audience", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(
      service.verify(await forge({ payload: { aud: "other-app" } })),
    ).resolves.toBeNull();
  });

  it.each(["sub", "sid", "jti", "iat", "exp"])(
    "should reject a token without the required %s claim",
    async (claim) => {
      vi.useFakeTimers({ now: NOW });
      const service = new JoseAccessTokenService(makeConfig());

      await expect(
        service.verify(await forge({ payload: { [claim]: undefined } })),
      ).resolves.toBeNull();
    },
  );

  it("should reject a token whose sid is not a string", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ payload: { sid: 42 } }))).resolves.toBeNull();
  });

  it("should accept a token signed with the previous key during rotation", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());
    const oldService = new JoseAccessTokenService(
      makeConfig({ currentKey: PREVIOUS_KEY, previousKey: null }),
    );

    const { token } = await oldService.issue(CLAIMS);

    await expect(service.verify(token)).resolves.toEqual(CLAIMS);
  });

  it("should reject a token with an unknown key id", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify(await forge({ header: { kid: "retired" } }))).resolves.toBeNull();
  });

  it("should reject a token signed with the previous key once it is no longer configured", async () => {
    vi.useFakeTimers({ now: NOW });
    const service = new JoseAccessTokenService(makeConfig({ previousKey: null }));
    const token = await forge({ header: { kid: PREVIOUS_KEY.id }, secret: PREVIOUS_KEY.secret });

    await expect(service.verify(token)).resolves.toBeNull();
  });

  it("should reject a malformed token", async () => {
    const service = new JoseAccessTokenService(makeConfig());

    await expect(service.verify("not-a-jwt")).resolves.toBeNull();
  });
});
