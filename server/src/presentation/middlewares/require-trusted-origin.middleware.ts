import { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Defesa em profundidade contra CSRF nas rotas de cookie (a primeira linha é o `SameSite=Strict`).
 * `Origin` ausente segue: clientes que não são navegador não o mandam, e CSRF exige navegador.
 */
export function requireTrustedOrigin(allowedOrigin: string): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;
    if (origin !== undefined && origin !== allowedOrigin) {
      res.status(403).json({ error: "ORIGIN_NOT_ALLOWED", message: "Origin not allowed" });
      return;
    }
    next();
  };
}
