import { Request, Response, NextFunction, CookieOptions } from "express";
import { AuthService } from "@src/application/services/auth.service";
import { AuthSessionResult } from "@src/application/dtos/auth.dto";
import {
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  RefreshTokenConflictError,
} from "@src/domain/errors/domain-error";

/** Atributos do cookie de refresh. `path` é o caminho visto pelo navegador (o `/api` do web). */
export interface RefreshCookieConfig {
  name: string;
  secure: boolean;
  path: string;
}

/**
 * O cookie é detalhe HTTP e mora aqui: o service devolve o refresh em claro e a expiração, sem
 * saber que cookie existe.
 */
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly cookie: RefreshCookieConfig,
  ) {}

  public async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.register(req.body);
      this.setRefreshCookie(res, result);
      res.status(201).json(result.response);
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.loginWithPassword(req.body);
      this.setRefreshCookie(res, result);
      res.status(200).json(result.response);
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        res.status(401).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.refresh(this.readRefreshCookie(req));
      this.setRefreshCookie(res, result);
      res.status(200).json(result.response);
    } catch (error) {
      if (error instanceof InvalidRefreshTokenError) {
        this.clearRefreshCookie(res);
        res.status(401).json({ error: error.code, message: error.message });
        return;
      }
      // Conflito dentro da janela: outra aba já renovou; o cookie novo dela vale, não se apaga nada.
      if (error instanceof RefreshTokenConflictError) {
        res.status(409).json({ error: error.code, message: error.message });
        return;
      }
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.logout({
        refreshToken: this.readRefreshCookie(req),
        sessionId: req.sessionId,
      });
      this.clearRefreshCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  public async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.service.logoutAll(req.userId!);
      this.clearRefreshCookie(res);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  private readRefreshCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[this.cookie.name];
    return typeof value === "string" && value !== "" ? value : undefined;
  }

  private setRefreshCookie(res: Response, result: AuthSessionResult): void {
    res.cookie(this.cookie.name, result.refreshToken, {
      ...this.cookieAttributes(),
      maxAge: Math.max(0, result.refreshTokenExpiresAt.getTime() - Date.now()),
    });
  }

  /** Mesmos atributos da emissão: o navegador só apaga o cookie se `Path` coincidir. */
  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.cookie.name, this.cookieAttributes());
  }

  private cookieAttributes(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookie.secure,
      sameSite: "strict",
      path: this.cookie.path,
    };
  }
}
