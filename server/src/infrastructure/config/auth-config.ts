import { z } from "zod";

const MIN_SECRET_BYTES = 32;
const STRICT_BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const KEY_ID = /^[A-Za-z0-9._-]+$/;

/**
 * Pisos de custo do Argon2id fora de `test` (OWASP Password Storage Cheat Sheet; o piso de
 * `parallelism`, 1, já é o do schema de inteiro positivo). Em `test` vale só o mínimo do próprio
 * Argon2 (8 KiB por faixa), para os testes não pagarem 64 MiB por hash.
 */
const ARGON2_FLOORS = { memoryKib: 19456, timeCost: 2 } as const;
const ARGON2_MIN_MEMORY_KIB_PER_LANE = 8;

/**
 * `Buffer.from(x, "base64")` aceita qualquer coisa e descarta em silêncio o que não reconhece:
 * um segredo colado com espaço ou em base64url viraria uma chave mais curta sem erro nenhum.
 * Por isso a forma é conferida por regex antes de decodificar.
 */
function decodeSecret(value: string, ctx: z.RefinementCtx, label: string): Buffer {
  if (!STRICT_BASE64.test(value)) {
    ctx.addIssue({ code: "custom", message: `${label} must be standard base64` });
    return Buffer.alloc(0);
  }
  const bytes = Buffer.from(value, "base64");
  if (bytes.length < MIN_SECRET_BYTES) {
    ctx.addIssue({
      code: "custom",
      message: `${label} must decode to at least ${MIN_SECRET_BYTES} bytes (openssl rand -base64 32)`,
    });
  }
  return bytes;
}

export const base64SecretSchema = z
  .string()
  .transform((value, ctx) => decodeSecret(value, ctx, "secret"));

export const keyIdSchema = z.string().regex(KEY_ID, "key id must match [A-Za-z0-9._-]+");

/** Chaveiro `id:base64,id:base64`; o id fica gravado ao lado do hash para escolher a chave. */
export const pepperKeyringSchema = z.string().transform((value, ctx) => {
  const keyring = new Map<string, Buffer>();
  for (const entry of value.split(",")) {
    const separator = entry.indexOf(":");
    const id = separator === -1 ? "" : entry.slice(0, separator).trim();
    if (!KEY_ID.test(id)) {
      ctx.addIssue({ code: "custom", message: "each pepper must be written as id:base64" });
      continue;
    }
    if (keyring.has(id)) {
      ctx.addIssue({ code: "custom", message: `pepper id "${id}" is duplicated` });
      continue;
    }
    keyring.set(id, decodeSecret(entry.slice(separator + 1).trim(), ctx, `pepper "${id}"`));
  }
  return keyring as ReadonlyMap<string, Buffer>;
});

export const positiveIntSchema = z.coerce.number().int().positive();
export const nonNegativeIntSchema = z.coerce.number().int().nonnegative();

export const booleanFlagSchema = z.enum(["true", "false"]).transform((value) => value === "true");

/**
 * Valor de `app.set("trust proxy", …)`: número de saltos ou lista de IPs/sub-redes/nomes do
 * Express. `true` fica de fora porque confia em qualquer salto e torna o `X-Forwarded-For`
 * forjável — o rate limit passaria a contar pelo IP que o cliente quiser.
 */
export const trustProxySchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value !== "true", "TRUST_PROXY=true trusts every hop; list the proxy instead")
  .transform((value): number | string => (/^\d+$/.test(value) ? Number(value) : value));

export type NodeEnv = "development" | "production" | "test";

export interface AuthEnv {
  NODE_ENV: NodeEnv;
  JWT_SECRET: Buffer;
  JWT_KEY_ID: string;
  JWT_PREVIOUS_SECRET?: Buffer;
  JWT_PREVIOUS_KEY_ID?: string;
  JWT_ISSUER: string;
  JWT_AUDIENCE: string;
  ACCESS_TOKEN_TTL_SECONDS: number;
  REFRESH_TOKEN_TTL_SECONDS: number;
  SESSION_MAX_LIFETIME_SECONDS: number;
  REFRESH_REUSE_GRACE_SECONDS: number;
  PASSWORD_PEPPERS: ReadonlyMap<string, Buffer>;
  PASSWORD_PEPPER_CURRENT_ID: string;
  ARGON2_MEMORY_KIB: number;
  ARGON2_TIME_COST: number;
  ARGON2_PARALLELISM: number;
  AUTH_COOKIE_SECURE?: boolean;
  AUTH_COOKIE_PATH: string;
  TRUST_PROXY?: number | string;
  AUTH_RATE_LIMIT_REGISTER_PER_IP: number;
  AUTH_RATE_LIMIT_LOGIN_PER_IP: number;
  AUTH_RATE_LIMIT_LOGIN_PER_EMAIL: number;
  AUTH_RATE_LIMIT_REFRESH_PER_IP: number;
}

const isLocalEnv = (nodeEnv: NodeEnv): boolean => nodeEnv === "development" || nodeEnv === "test";

/** Regras que dependem de mais de uma variável; rodam depois que cada campo já foi validado. */
export function checkAuthEnv(env: AuthEnv, ctx: z.RefinementCtx): void {
  const issue = (path: keyof AuthEnv, message: string): void => {
    ctx.addIssue({ code: "custom", path: [path], message });
  };

  if (!env.PASSWORD_PEPPERS.has(env.PASSWORD_PEPPER_CURRENT_ID)) {
    issue("PASSWORD_PEPPER_CURRENT_ID", "current pepper id must exist in PASSWORD_PEPPERS");
  }

  if ((env.JWT_PREVIOUS_SECRET === undefined) !== (env.JWT_PREVIOUS_KEY_ID === undefined)) {
    issue("JWT_PREVIOUS_KEY_ID", "JWT_PREVIOUS_SECRET and JWT_PREVIOUS_KEY_ID go together");
  } else if (env.JWT_PREVIOUS_KEY_ID === env.JWT_KEY_ID) {
    issue("JWT_PREVIOUS_KEY_ID", "previous key id must differ from JWT_KEY_ID");
  }

  if (env.NODE_ENV === "test") {
    if (env.ARGON2_MEMORY_KIB < ARGON2_MIN_MEMORY_KIB_PER_LANE * env.ARGON2_PARALLELISM) {
      issue("ARGON2_MEMORY_KIB", "must be at least 8 KiB per lane of parallelism");
    }
  } else {
    if (env.ARGON2_MEMORY_KIB < ARGON2_FLOORS.memoryKib) {
      issue("ARGON2_MEMORY_KIB", `must be at least ${ARGON2_FLOORS.memoryKib} outside test`);
    }
    if (env.ARGON2_TIME_COST < ARGON2_FLOORS.timeCost) {
      issue("ARGON2_TIME_COST", `must be at least ${ARGON2_FLOORS.timeCost} outside test`);
    }
  }

  if (env.TRUST_PROXY === undefined && !isLocalEnv(env.NODE_ENV)) {
    issue("TRUST_PROXY", "TRUST_PROXY is required outside development and test");
  }
}

const MINUTE_MS = 60 * 1000;

/** Janelas fixas do rate limit (§11.3); só a quantidade por janela é configurável. */
const RATE_LIMIT_WINDOWS_MS = {
  register: 60 * MINUTE_MS,
  loginPerIp: 15 * MINUTE_MS,
  loginPerEmail: 15 * MINUTE_MS,
  refresh: MINUTE_MS,
} as const;

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface SigningKey {
  id: string;
  secret: Buffer;
}

/**
 * Configuração de autenticação já validada, injetada pelo container nos adapters e no HTTP —
 * nenhum deles lê `env.ts`, o que deixa os testes de cada um montarem a sua sem `process.env`.
 */
export interface AuthConfig {
  accessToken: {
    currentKey: SigningKey;
    previousKey: SigningKey | null;
    issuer: string;
    audience: string;
    ttlSeconds: number;
  };
  session: {
    refreshTokenTtlSeconds: number;
    maxLifetimeSeconds: number;
    refreshReuseGraceSeconds: number;
  };
  password: {
    peppers: ReadonlyMap<string, Buffer>;
    currentPepperId: string;
    argon2: { memoryCost: number; timeCost: number; parallelism: number };
  };
  cookie: { secure: boolean; path: string };
  trustProxy: number | string | null;
  rateLimits: Record<keyof typeof RATE_LIMIT_WINDOWS_MS, RateLimitRule>;
}

export function buildAuthConfig(env: AuthEnv): AuthConfig {
  return {
    accessToken: {
      currentKey: { id: env.JWT_KEY_ID, secret: env.JWT_SECRET },
      previousKey:
        env.JWT_PREVIOUS_KEY_ID !== undefined && env.JWT_PREVIOUS_SECRET !== undefined
          ? { id: env.JWT_PREVIOUS_KEY_ID, secret: env.JWT_PREVIOUS_SECRET }
          : null,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      ttlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    },
    session: {
      refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
      maxLifetimeSeconds: env.SESSION_MAX_LIFETIME_SECONDS,
      refreshReuseGraceSeconds: env.REFRESH_REUSE_GRACE_SECONDS,
    },
    password: {
      peppers: env.PASSWORD_PEPPERS,
      currentPepperId: env.PASSWORD_PEPPER_CURRENT_ID,
      argon2: {
        memoryCost: env.ARGON2_MEMORY_KIB,
        timeCost: env.ARGON2_TIME_COST,
        parallelism: env.ARGON2_PARALLELISM,
      },
    },
    cookie: {
      secure: env.AUTH_COOKIE_SECURE ?? !isLocalEnv(env.NODE_ENV),
      path: env.AUTH_COOKIE_PATH,
    },
    trustProxy: env.TRUST_PROXY ?? null,
    rateLimits: {
      register: {
        limit: env.AUTH_RATE_LIMIT_REGISTER_PER_IP,
        windowMs: RATE_LIMIT_WINDOWS_MS.register,
      },
      loginPerIp: {
        limit: env.AUTH_RATE_LIMIT_LOGIN_PER_IP,
        windowMs: RATE_LIMIT_WINDOWS_MS.loginPerIp,
      },
      loginPerEmail: {
        limit: env.AUTH_RATE_LIMIT_LOGIN_PER_EMAIL,
        windowMs: RATE_LIMIT_WINDOWS_MS.loginPerEmail,
      },
      refresh: {
        limit: env.AUTH_RATE_LIMIT_REFRESH_PER_IP,
        windowMs: RATE_LIMIT_WINDOWS_MS.refresh,
      },
    },
  };
}
