import { RequestHandler, Router } from "express";
import cookieParser from "cookie-parser";
import { AuthController } from "@src/presentation/controllers/auth.controller";
import { validateRequest } from "@src/presentation/middlewares/validate-request.middleware";
import { requireTrustedOrigin } from "@src/presentation/middlewares/require-trusted-origin.middleware";
import { AuthRateLimiters } from "@src/presentation/middlewares/rate-limit.middleware";
import { loginSchema, registerSchema } from "@src/application/dtos/auth.dto";

export interface AuthRoutesOptions {
  /** Exige Bearer válido (`authenticate`). */
  authenticate: RequestHandler;
  /** Identifica o autor se houver Bearer válido, sem exigir (`authenticateIfPresent`). */
  authenticateIfPresent: RequestHandler;
  /** Origem pública do web (`CORS_ORIGIN`). */
  trustedOrigin: string;
  rateLimiters: AuthRateLimiters;
}

export function createAuthRoutes(controller: AuthController, options: AuthRoutesOptions): Router {
  const router = Router();
  const { authenticate, authenticateIfPresent, trustedOrigin, rateLimiters } = options;

  // O cookie de refresh só existe para /auth: o parser fica neste sub-router.
  router.use(cookieParser());
  router.use(requireTrustedOrigin(trustedOrigin));

  router.post(
    "/register",
    rateLimiters.register,
    validateRequest(registerSchema),
    controller.register.bind(controller),
  );
  router.post(
    "/login",
    rateLimiters.loginPerIp,
    rateLimiters.loginPerEmail,
    validateRequest(loginSchema),
    controller.login.bind(controller),
  );
  router.post("/refresh", rateLimiters.refresh, controller.refresh.bind(controller));
  router.post("/logout", authenticateIfPresent, controller.logout.bind(controller));
  router.post("/logout-all", authenticate, controller.logoutAll.bind(controller));

  return router;
}
