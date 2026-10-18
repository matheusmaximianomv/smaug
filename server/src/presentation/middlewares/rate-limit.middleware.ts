import { Request, RequestHandler } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { Logger } from "@src/application/ports/logger.interface.ts";

export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

/** Limites por rota (§11.3), vindos do `authConfig`. A chave é o IP do cliente, correto só com `TRUST_PROXY` configurado. */
export interface AuthRateLimits {
  register: RateLimitRule;
  loginPerIp: RateLimitRule;
  loginPerEmail: RateLimitRule;
  refresh: RateLimitRule;
}

export type AuthRateLimiters = Record<keyof AuthRateLimits, RequestHandler>;

/**
 * IP + e-mail normalizado: força bruta numa conta não se esconde atrás de vários e-mails. Sem
 * `req.ip` (conexão já fechada) a chave cai num balde comum em vez de quebrar a requisição.
 */
export function ipAndEmailKey(req: Request): string {
  const email: unknown = req.body?.email;
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  return `${ipKeyGenerator(req.ip ?? "")}|${normalized}`;
}

/** Store em memória (processo único). O 429 segue o formato de erro do projeto, com `Retry-After`. */
export function createAuthRateLimiters(logger: Logger, limits: AuthRateLimits): AuthRateLimiters {
  const limiter = (name: keyof AuthRateLimits, keyGenerator?: (req: Request) => string) =>
    rateLimit({
      ...limits[name],
      standardHeaders: "draft-8",
      legacyHeaders: false,
      ...(keyGenerator ? { keyGenerator } : {}),
      handler: (req, res) => {
        logger.warn("auth.rate_limited", { limiter: name, path: req.originalUrl });
        res.status(429).json({
          error: "TOO_MANY_REQUESTS",
          message: "Too many requests, try again later",
        });
      },
    });

  return {
    register: limiter("register"),
    loginPerIp: limiter("loginPerIp"),
    loginPerEmail: limiter("loginPerEmail", ipAndEmailKey),
    refresh: limiter("refresh"),
  };
}
