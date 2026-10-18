import { Router } from "express";
import { healthController } from "@src/presentation/controllers/health.controller.ts";
import {
  container,
  authController,
  authenticateRequestUseCase,
  userController,
  oneTimeRevenueController,
  oneTimeExpenseController,
  installmentExpenseController,
  recurringExpenseController,
  fixedRevenueController,
  revenueQueryController,
  expenseQueryController,
  expenseCategoryController,
  dataController,
} from "@src/infrastructure/config/container";
import { authConfig, env } from "@src/infrastructure/config/env.ts";
import { Logger } from "@src/application/ports/logger.interface.ts";
import { createAuthRoutes } from "@src/presentation/routes/auth.routes";
import { createUserRoutes } from "@src/presentation/routes/user.routes";
import { createOneTimeRevenueRoutes } from "@src/presentation/routes/one-time-revenue.routes";
import { createOneTimeExpenseRoutes } from "@src/presentation/routes/one-time-expense.routes";
import { createInstallmentExpenseRoutes } from "@src/presentation/routes/installment-expense.routes";
import { createRecurringExpenseRoutes } from "@src/presentation/routes/recurring-expense.routes";
import { createFixedRevenueRoutes } from "@src/presentation/routes/fixed-revenue.routes";
import { createRevenueQueryRoutes } from "@src/presentation/routes/revenue-query.routes";
import { createExpenseCategoryRoutes } from "@src/presentation/routes/expense-category.routes";
import { createExpenseQueryRoutes } from "@src/presentation/routes/expense-query.routes";
import { createDataRoutes } from "@src/presentation/routes/data.routes";
import {
  authenticate,
  authenticateIfPresent,
} from "@src/presentation/middlewares/authenticate.middleware";
import { createAuthRateLimiters } from "@src/presentation/middlewares/rate-limit.middleware";

const router = Router();
const authenticateMiddleware = authenticate(authenticateRequestUseCase);

router.get("/health", healthController);
router.use(
  "/auth",
  createAuthRoutes(authController, {
    authenticate: authenticateMiddleware,
    authenticateIfPresent: authenticateIfPresent(authenticateRequestUseCase),
    trustedOrigin: env.CORS_ORIGIN,
    rateLimiters: createAuthRateLimiters(
      container.resolve<Logger>("Logger"),
      authConfig.rateLimits,
    ),
  }),
);
router.use("/users", authenticateMiddleware, createUserRoutes(userController));
router.use(
  "/expenses/categories",
  authenticateMiddleware,
  createExpenseCategoryRoutes(expenseCategoryController),
);
router.use(
  "/expenses/one-time",
  authenticateMiddleware,
  createOneTimeExpenseRoutes(oneTimeExpenseController),
);
router.use(
  "/expenses/installment",
  authenticateMiddleware,
  createInstallmentExpenseRoutes(installmentExpenseController),
);
router.use(
  "/expenses/recurring",
  authenticateMiddleware,
  createRecurringExpenseRoutes(recurringExpenseController),
);
router.use(
  "/revenues/one-time",
  authenticateMiddleware,
  createOneTimeRevenueRoutes(oneTimeRevenueController),
);
router.use(
  "/revenues/fixed",
  authenticateMiddleware,
  createFixedRevenueRoutes(fixedRevenueController),
);
router.use("/data", authenticateMiddleware, createDataRoutes(dataController));
router.use("/revenues", authenticateMiddleware, createRevenueQueryRoutes(revenueQueryController));
router.use("/expenses", authenticateMiddleware, createExpenseQueryRoutes(expenseQueryController));

export default router;
