import { describe, expect, it, vi, afterEach } from "vitest";

// Sem isto o server/.env local repõe no import as variáveis que um caso apaga de propósito.
vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));

const JWT_SECRET = "dGVzdC1vbmx5LWp3dC1zZWNyZXQtbm90LXNlY3JldCE=";
const PREVIOUS_JWT_SECRET = "dGVzdC1vbmx5LW9sZC1qd3Qtbm90LWEtc2VjcmV0ISE=";
const PEPPER = "dGVzdC1vbmx5LXBlcHBlci1ub3QtYS1zZWNyZXQhISE=";
const SHORT_SECRET = Buffer.alloc(31, 1).toString("base64");

const BASE_ENV = {
  DATABASE_PROVIDER: "memory",
  DATABASE_URL: "file:./dev.db",
  NODE_ENV: "development",
  JWT_SECRET,
  JWT_KEY_ID: "2026-10",
  PASSWORD_PEPPERS: `p1:${PEPPER}`,
  PASSWORD_PEPPER_CURRENT_ID: "p1",
};

const AUTH_KEYS = [
  "JWT_PREVIOUS_SECRET",
  "JWT_PREVIOUS_KEY_ID",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "ACCESS_TOKEN_TTL_SECONDS",
  "REFRESH_TOKEN_TTL_SECONDS",
  "SESSION_MAX_LIFETIME_SECONDS",
  "REFRESH_REUSE_GRACE_SECONDS",
  "ARGON2_MEMORY_KIB",
  "ARGON2_TIME_COST",
  "ARGON2_PARALLELISM",
  "AUTH_COOKIE_SECURE",
  "AUTH_COOKIE_PATH",
  "TRUST_PROXY",
  "AUTH_RATE_LIMIT_REGISTER_PER_IP",
  "AUTH_RATE_LIMIT_LOGIN_PER_IP",
  "AUTH_RATE_LIMIT_LOGIN_PER_EMAIL",
  "AUTH_RATE_LIMIT_REFRESH_PER_IP",
];

async function importEnvModule() {
  return import("@src/infrastructure/config/env.ts");
}

/** Parte do env de teste, sem os parâmetros de auth que o vitest.config injeta, e aplica `overrides`. */
function setEnv(overrides: Record<string, string | undefined> = {}): void {
  const next: NodeJS.ProcessEnv = { ...process.env, ...BASE_ENV };
  for (const key of AUTH_KEYS) delete next[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  process.env = next;
}

async function expectInvalid(field: string): Promise<void> {
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("exit");
  });
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(importEnvModule()).rejects.toThrow("exit");
  expect(process.exit).toHaveBeenCalledWith(1);
  expect(errorSpy.mock.calls[0]?.[1]).toHaveProperty(field);
}

describe("env config validation", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("loads valid environment", async () => {
    setEnv({ PORT: "3001", LOG_LEVEL: "debug" });

    const mod = await importEnvModule();
    expect(mod.env.DATABASE_PROVIDER).toBe("memory");
    expect(mod.env.PORT).toBe(3001);
  });

  it("fails fast on invalid environment", async () => {
    process.env = { ...original, DATABASE_PROVIDER: "invalid", DATABASE_URL: "", NODE_ENV: "dev" };
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("exit");
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(importEnvModule()).rejects.toThrow("exit");
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("resolves a relative SQLite path from the working directory, not from the schema folder", async () => {
    setEnv({ DATABASE_PROVIDER: "sqlite", DATABASE_URL: "file:./prisma/sqlite/dev.db" });

    const mod = await importEnvModule();
    expect(mod.env.DATABASE_URL).toBe(`file:${process.cwd()}/prisma/sqlite/dev.db`);
  });

  it("should drop trailing slashes from CORS_ORIGIN so it matches the browser Origin header", async () => {
    setEnv({ CORS_ORIGIN: "https://smaug.example.com//" });

    const mod = await importEnvModule();
    expect(mod.env.CORS_ORIGIN).toBe("https://smaug.example.com");
  });

  it("should default CORS_ORIGIN to the local web origin", async () => {
    setEnv({ CORS_ORIGIN: undefined });

    const mod = await importEnvModule();
    expect(mod.env.CORS_ORIGIN).toBe("http://localhost:3001");
  });

  describe("auth config", () => {
    it("should apply the documented defaults in development", async () => {
      setEnv();

      const { authConfig } = await importEnvModule();

      expect(authConfig).toEqual({
        accessToken: {
          currentKey: { id: "2026-10", secret: Buffer.from(JWT_SECRET, "base64") },
          previousKey: null,
          issuer: "smaug-api",
          audience: "smaug-web",
          ttlSeconds: 600,
        },
        session: {
          refreshTokenTtlSeconds: 604800,
          maxLifetimeSeconds: 2592000,
          refreshReuseGraceSeconds: 30,
        },
        password: {
          peppers: new Map([["p1", Buffer.from(PEPPER, "base64")]]),
          currentPepperId: "p1",
          argon2: { memoryCost: 65536, timeCost: 3, parallelism: 4 },
        },
        cookie: { secure: false, path: "/api/auth" },
        trustProxy: null,
        rateLimits: {
          register: { limit: 10, windowMs: 60 * 60 * 1000 },
          loginPerIp: { limit: 50, windowMs: 15 * 60 * 1000 },
          loginPerEmail: { limit: 10, windowMs: 15 * 60 * 1000 },
          refresh: { limit: 60, windowMs: 60 * 1000 },
        },
      });
    });

    it("should default the cookie to Secure and read every override in production", async () => {
      setEnv({
        NODE_ENV: "production",
        TRUST_PROXY: "1",
        JWT_PREVIOUS_SECRET: PREVIOUS_JWT_SECRET,
        JWT_PREVIOUS_KEY_ID: "2026-04",
        JWT_ISSUER: "issuer",
        JWT_AUDIENCE: "audience",
        ACCESS_TOKEN_TTL_SECONDS: "60",
        REFRESH_TOKEN_TTL_SECONDS: "120",
        SESSION_MAX_LIFETIME_SECONDS: "240",
        REFRESH_REUSE_GRACE_SECONDS: "0",
        PASSWORD_PEPPERS: `p0:${PREVIOUS_JWT_SECRET}, p1:${PEPPER}`,
        ARGON2_MEMORY_KIB: "19456",
        ARGON2_TIME_COST: "2",
        ARGON2_PARALLELISM: "1",
        AUTH_COOKIE_PATH: "/auth",
        AUTH_RATE_LIMIT_REGISTER_PER_IP: "1",
        AUTH_RATE_LIMIT_LOGIN_PER_IP: "2",
        AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: "3",
        AUTH_RATE_LIMIT_REFRESH_PER_IP: "4",
      });

      const { authConfig } = await importEnvModule();

      expect(authConfig.accessToken).toEqual({
        currentKey: { id: "2026-10", secret: Buffer.from(JWT_SECRET, "base64") },
        previousKey: { id: "2026-04", secret: Buffer.from(PREVIOUS_JWT_SECRET, "base64") },
        issuer: "issuer",
        audience: "audience",
        ttlSeconds: 60,
      });
      expect(authConfig.session).toEqual({
        refreshTokenTtlSeconds: 120,
        maxLifetimeSeconds: 240,
        refreshReuseGraceSeconds: 0,
      });
      expect([...authConfig.password.peppers.keys()]).toEqual(["p0", "p1"]);
      expect(authConfig.password.argon2).toEqual({
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });
      expect(authConfig.cookie).toEqual({ secure: true, path: "/auth" });
      expect(authConfig.trustProxy).toBe(1);
      expect(authConfig.rateLimits).toEqual({
        register: { limit: 1, windowMs: 60 * 60 * 1000 },
        loginPerIp: { limit: 2, windowMs: 15 * 60 * 1000 },
        loginPerEmail: { limit: 3, windowMs: 15 * 60 * 1000 },
        refresh: { limit: 4, windowMs: 60 * 1000 },
      });
    });

    it.each([
      ["AUTH_RATE_LIMIT_REGISTER_PER_IP", "0"],
      ["AUTH_RATE_LIMIT_LOGIN_PER_IP", "-1"],
      ["AUTH_RATE_LIMIT_LOGIN_PER_EMAIL", "1.5"],
      ["AUTH_RATE_LIMIT_REFRESH_PER_IP", "many"],
    ])("should reject %s=%s, which is not a positive integer", async (field, value) => {
      setEnv({ [field]: value });
      await expectInvalid(field);
    });

    it("should keep a non-numeric TRUST_PROXY as the Express list and honour AUTH_COOKIE_SECURE", async () => {
      setEnv({
        NODE_ENV: "production",
        TRUST_PROXY: " loopback, 172.16.0.0/12 ",
        AUTH_COOKIE_SECURE: "false",
      });

      const { authConfig } = await importEnvModule();

      expect(authConfig.trustProxy).toBe("loopback, 172.16.0.0/12");
      expect(authConfig.cookie.secure).toBe(false);
    });

    it("should accept the Argon2 minimum only when NODE_ENV is test", async () => {
      setEnv({
        NODE_ENV: "test",
        ARGON2_MEMORY_KIB: "8",
        ARGON2_TIME_COST: "1",
        ARGON2_PARALLELISM: "1",
        AUTH_COOKIE_SECURE: "true",
      });

      const { authConfig } = await importEnvModule();

      expect(authConfig.password.argon2).toEqual({ memoryCost: 8, timeCost: 1, parallelism: 1 });
      expect(authConfig.cookie.secure).toBe(true);
    });

    it.each([
      ["JWT_SECRET", { JWT_SECRET: undefined }],
      ["JWT_KEY_ID", { JWT_KEY_ID: undefined }],
      ["PASSWORD_PEPPERS", { PASSWORD_PEPPERS: undefined }],
      ["PASSWORD_PEPPER_CURRENT_ID", { PASSWORD_PEPPER_CURRENT_ID: undefined }],
    ])("should fail fast when the required secret %s is missing", async (field, overrides) => {
      setEnv(overrides);
      await expectInvalid(field);
    });

    it.each([
      ["a secret shorter than 32 bytes", { JWT_SECRET: SHORT_SECRET }, "JWT_SECRET"],
      ["a secret that is not base64", { JWT_SECRET: "not base64 at all!!" }, "JWT_SECRET"],
      ["an unpadded base64 secret", { JWT_SECRET: JWT_SECRET.replace("=", "") }, "JWT_SECRET"],
      [
        "a short previous secret",
        { JWT_PREVIOUS_SECRET: SHORT_SECRET, JWT_PREVIOUS_KEY_ID: "old" },
        "JWT_PREVIOUS_SECRET",
      ],
      ["a key id with spaces", { JWT_KEY_ID: "key 1" }, "JWT_KEY_ID"],
      ["a pepper without id", { PASSWORD_PEPPERS: PEPPER }, "PASSWORD_PEPPERS"],
      ["a pepper with an invalid id", { PASSWORD_PEPPERS: `p 1:${PEPPER}` }, "PASSWORD_PEPPERS"],
      [
        "a duplicated pepper id",
        { PASSWORD_PEPPERS: `p1:${PEPPER},p1:${PEPPER}` },
        "PASSWORD_PEPPERS",
      ],
      ["a short pepper", { PASSWORD_PEPPERS: `p1:${SHORT_SECRET}` }, "PASSWORD_PEPPERS"],
      ["a pepper that is not base64", { PASSWORD_PEPPERS: "p1:%%%%" }, "PASSWORD_PEPPERS"],
      [
        "a current pepper outside the keyring",
        { PASSWORD_PEPPER_CURRENT_ID: "p2" },
        "PASSWORD_PEPPER_CURRENT_ID",
      ],
      [
        "a previous secret without its key id",
        { JWT_PREVIOUS_SECRET: PREVIOUS_JWT_SECRET },
        "JWT_PREVIOUS_KEY_ID",
      ],
      [
        "a previous key id without its secret",
        { JWT_PREVIOUS_KEY_ID: "old" },
        "JWT_PREVIOUS_KEY_ID",
      ],
      [
        "a previous key id equal to the current one",
        { JWT_PREVIOUS_SECRET: PREVIOUS_JWT_SECRET, JWT_PREVIOUS_KEY_ID: "2026-10" },
        "JWT_PREVIOUS_KEY_ID",
      ],
      ["a zero access token TTL", { ACCESS_TOKEN_TTL_SECONDS: "0" }, "ACCESS_TOKEN_TTL_SECONDS"],
      [
        "a negative reuse grace",
        { REFRESH_REUSE_GRACE_SECONDS: "-1" },
        "REFRESH_REUSE_GRACE_SECONDS",
      ],
      [
        "a non-integer refresh TTL",
        { REFRESH_TOKEN_TTL_SECONDS: "1.5" },
        "REFRESH_TOKEN_TTL_SECONDS",
      ],
      ["a zero Argon2 parallelism", { ARGON2_PARALLELISM: "0" }, "ARGON2_PARALLELISM"],
      [
        "an AUTH_COOKIE_SECURE that is not a boolean",
        { AUTH_COOKIE_SECURE: "yes" },
        "AUTH_COOKIE_SECURE",
      ],
      [
        "an AUTH_COOKIE_PATH that is not absolute",
        { AUTH_COOKIE_PATH: "api/auth" },
        "AUTH_COOKIE_PATH",
      ],
      ["TRUST_PROXY=true", { TRUST_PROXY: "true" }, "TRUST_PROXY"],
      ["an empty TRUST_PROXY", { TRUST_PROXY: " " }, "TRUST_PROXY"],
    ])("should fail fast on %s", async (_case, overrides, field) => {
      setEnv(overrides);
      await expectInvalid(field);
    });

    it.each([
      ["memory", { ARGON2_MEMORY_KIB: "19455" }, "ARGON2_MEMORY_KIB"],
      ["time cost", { ARGON2_TIME_COST: "1" }, "ARGON2_TIME_COST"],
    ])("should enforce the OWASP Argon2 %s floor outside test", async (_case, overrides, field) => {
      setEnv({ NODE_ENV: "production", TRUST_PROXY: "1", ...overrides });
      await expectInvalid(field);
    });

    it("should still reject less than 8 KiB per Argon2 lane in test", async () => {
      setEnv({ NODE_ENV: "test", ARGON2_MEMORY_KIB: "15", ARGON2_PARALLELISM: "2" });
      await expectInvalid("ARGON2_MEMORY_KIB");
    });

    it("should require TRUST_PROXY outside development and test", async () => {
      setEnv({ NODE_ENV: "production" });
      await expectInvalid("TRUST_PROXY");
    });
  });
});
