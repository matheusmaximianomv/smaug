import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { CryptoRefreshTokenGenerator } from "@src/infrastructure/auth/crypto-refresh-token-generator.ts";

describe("CryptoRefreshTokenGenerator", () => {
  const generator = new CryptoRefreshTokenGenerator();

  it("should generate 32 random bytes encoded as 43 base64url characters", () => {
    const { plain } = generator.generate();

    expect(plain).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(plain, "base64url")).toHaveLength(32);
  });

  it("should pair the token with the hex SHA-256 of it", () => {
    const { plain, hash } = generator.generate();

    expect(hash).toBe(createHash("sha256").update(plain).digest("hex"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("should hash deterministically so a cookie value finds its row", () => {
    const { plain, hash } = generator.generate();

    expect(generator.hash(plain)).toBe(hash);
    expect(generator.hash(plain)).toBe(generator.hash(plain));
  });

  it("should generate a different token and hash on every call", () => {
    const first = generator.generate();
    const second = generator.generate();

    expect(first.plain).not.toBe(second.plain);
    expect(first.hash).not.toBe(second.hash);
  });
});
