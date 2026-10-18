import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthenticateRequestUseCase } from "@src/domain/use-cases/auth/authenticate-request.use-case";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    sessionId?: string;
  }
}

const BEARER = /^Bearer ([^\s]+)$/i;

/**
 * Lê o Bearer e confere o token e a sessão. Preenche `req.userId`/`req.sessionId` e devolve
 * `true` quando a requisição tem dono; o motivo de uma falha não sai daqui.
 */
async function identify(req: Request, useCase: AuthenticateRequestUseCase): Promise<boolean> {
  const match = BEARER.exec(req.headers.authorization ?? "");
  if (!match) {
    return false;
  }
  const claims = await useCase.execute({ accessToken: match[1] as string });
  if (!claims) {
    return false;
  }
  req.userId = claims.userId;
  req.sessionId = claims.sessionId;
  return true;
}

/** Exige access token válido de sessão ativa; 401 genérico em qualquer falha. Não loga o token. */
export function authenticate(useCase: AuthenticateRequestUseCase): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!(await identify(req, useCase))) {
      res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required" });
      return;
    }
    next();
  };
}

/**
 * Identifica o autor quando há um Bearer válido e segue de qualquer forma: é o logout, que aceita
 * o cookie ou o access token (que pode já ter expirado — o cookie basta).
 */
export function authenticateIfPresent(useCase: AuthenticateRequestUseCase): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    await identify(req, useCase);
    next();
  };
}
