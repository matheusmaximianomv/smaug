import { describe, it, expect, vi, beforeEach } from "vitest";

// Espiões que repassam para a biblioteca real: o namespace ESM não aceita vi.spyOn.
vi.mock("argon2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("argon2")>();
  return { ...actual, hash: vi.fn(actual.hash), verify: vi.fn(actual.verify) };
});

const argon2 = await import("argon2");
const { Argon2PasswordHasher } = await import("@src/infrastructure/auth/argon2-password-hasher.ts");
type Argon2PasswordHasherConfig =
  import("@src/infrastructure/auth/argon2-password-hasher.ts").Argon2PasswordHasherConfig;

const MIN_PARAMS = { memoryCost: 1024, timeCost: 1, parallelism: 1 };
const PEPPER_A = Buffer.alloc(32, 1);
const PEPPER_B = Buffer.alloc(32, 2);
const PASSWORD = "correct horse battery";

function makeConfig(
  overrides: Partial<Argon2PasswordHasherConfig> = {},
): Argon2PasswordHasherConfig {
  return {
    peppers: new Map([
      ["p1", PEPPER_A],
      ["p2", PEPPER_B],
    ]),
    currentPepperId: "p1",
    argon2: MIN_PARAMS,
    ...overrides,
  };
}

describe("Argon2PasswordHasher", () => {
  beforeEach(() => {
    vi.mocked(argon2.hash).mockClear();
    vi.mocked(argon2.verify).mockClear();
  });

  it("should produce an argon2id PHC string tagged with the current pepper id", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());

    const result = await hasher.hash(PASSWORD);

    expect(result.hash.startsWith("$argon2id$v=19$m=1024,p=1,t=1$")).toBe(true);
    expect(result.hash).not.toContain(PASSWORD);
    expect(result.pepperId).toBe("p1");
  });

  it("should produce different hashes for the same password because of the random salt", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());

    const first = await hasher.hash(PASSWORD);
    const second = await hasher.hash(PASSWORD);

    expect(first.hash).not.toBe(second.hash);
  });

  it("should verify the right password without asking for a rehash", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const stored = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, stored)).resolves.toEqual({
      matches: true,
      needsRehash: false,
    });
  });

  it("should reject a wrong password", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const stored = await hasher.hash(PASSWORD);

    await expect(hasher.verify("wrong horse battery", stored)).resolves.toEqual({
      matches: false,
      needsRehash: false,
    });
  });

  it("should reject the right password when the pepper behind the id changed", async () => {
    const stored = await new Argon2PasswordHasher(makeConfig()).hash(PASSWORD);
    const otherPepper = new Argon2PasswordHasher(
      makeConfig({ peppers: new Map([["p1", PEPPER_B]]) }),
    );

    await expect(otherPepper.verify(PASSWORD, stored)).resolves.toEqual({
      matches: false,
      needsRehash: false,
    });
  });

  it("should not match a hash made without the pepper", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const unpeppered = await argon2.hash(PASSWORD, { type: argon2.argon2id, ...MIN_PARAMS });

    const result = await hasher.verify(PASSWORD, { hash: unpeppered, pepperId: "p1" });

    expect(result.matches).toBe(false);
  });

  it("should ask for a rehash when the credential uses an older pepper", async () => {
    const stored = await new Argon2PasswordHasher(makeConfig()).hash(PASSWORD);
    const rotated = new Argon2PasswordHasher(makeConfig({ currentPepperId: "p2" }));

    await expect(rotated.verify(PASSWORD, stored)).resolves.toEqual({
      matches: true,
      needsRehash: true,
    });
  });

  it("should ask for a rehash when the cost parameters changed", async () => {
    const stored = await new Argon2PasswordHasher(makeConfig()).hash(PASSWORD);
    const recalibrated = new Argon2PasswordHasher(
      makeConfig({ argon2: { ...MIN_PARAMS, timeCost: 2 } }),
    );

    await expect(recalibrated.verify(PASSWORD, stored)).resolves.toEqual({
      matches: true,
      needsRehash: true,
    });
  });

  it("should treat a corrupted hash as a mismatch instead of throwing", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());

    await expect(
      hasher.verify(PASSWORD, { hash: "$argon2id$v=19$garbage", pepperId: "p1" }),
    ).resolves.toEqual({ matches: false, needsRehash: false });
  });

  it("should normalize the password with NFKC before hashing and verifying", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const stored = await hasher.hash("ﬁnancial secret");

    const result = await hasher.verify("financial secret", stored);

    expect(result.matches).toBe(true);
  });

  it("should throw a configuration error when the stored pepper id is not in the keyring", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const stored = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, { ...stored, pepperId: "gone" })).rejects.toThrow(
      'Password pepper "gone" is not in the keyring',
    );
  });

  it("should refuse to be built when the current pepper id is not in the keyring", () => {
    expect(() => new Argon2PasswordHasher(makeConfig({ currentPepperId: "missing" }))).toThrow(
      'Password pepper "missing" is not in the keyring',
    );
  });

  it("should generate the dummy hash once, at construction, with the current settings", async () => {
    const hashSpy = vi.mocked(argon2.hash);

    new Argon2PasswordHasher(makeConfig());

    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(hashSpy.mock.calls[0][1]).toMatchObject({ ...MIN_PARAMS, secret: PEPPER_A });
    await expect(hashSpy.mock.results[0].value).resolves.toMatch(/^\$argon2id\$/);
  });

  it("should run exactly one argon2 verify per call against the dummy hash", async () => {
    const hasher = new Argon2PasswordHasher(makeConfig());
    const hashSpy = vi.mocked(argon2.hash);
    const verifySpy = vi.mocked(argon2.verify);

    await expect(hasher.verifyAgainstDummy(PASSWORD)).resolves.toBeUndefined();
    await expect(hasher.verifyAgainstDummy("another password")).resolves.toBeUndefined();

    expect(hashSpy).toHaveBeenCalledTimes(1);
    expect(verifySpy).toHaveBeenCalledTimes(2);
    const dummy = await hashSpy.mock.results[0].value;
    expect(verifySpy).toHaveBeenNthCalledWith(1, dummy, PASSWORD, { secret: PEPPER_A });
    expect(verifySpy).toHaveBeenNthCalledWith(2, dummy, "another password", { secret: PEPPER_A });
  });
});
