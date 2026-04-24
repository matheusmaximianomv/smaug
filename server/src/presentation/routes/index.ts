import { Router } from "express";
import { healthController } from "@src/presentation/controllers/health.controller.ts";
import {
  userController,
  userRepository,
  oneTimeRevenueController,
  oneTimeExpenseController,
  installmentExpenseController,
  recurringExpenseController,
  fixedRevenueController,
  revenueQueryController,
  expenseQueryController,
  expenseCategoryController,
} from "@src/infrastructure/config/container";
import { createUserRoutes } from "@src/presentation/routes/user.routes";
import { createOneTimeRevenueRoutes } from "@src/presentation/routes/one-time-revenue.routes";
import { createOneTimeExpenseRoutes } from "@src/presentation/routes/one-time-expense.routes";
import { createInstallmentExpenseRoutes } from "@src/presentation/routes/installment-expense.routes";
import { createRecurringExpenseRoutes } from "@src/presentation/routes/recurring-expense.routes";
import { createFixedRevenueRoutes } from "@src/presentation/routes/fixed-revenue.routes";
import { createRevenueQueryRoutes } from "@src/presentation/routes/revenue-query.routes";
import { createExpenseCategoryRoutes } from "@src/presentation/routes/expense-category.routes";
import { createExpenseQueryRoutes } from "@src/presentation/routes/expense-query.routes";
import { extractUser } from "@src/presentation/middlewares/extract-user.middleware";

const router = Router();

router.get("/health", healthController);
router.use("/users", createUserRoutes(userController));
router.use(
  "/expenses/categories",
  extractUser(userRepository),
  createExpenseCategoryRoutes(expenseCategoryController),
);
router.use(
  "/expenses/one-time",
  extractUser(userRepository),
  createOneTimeExpenseRoutes(oneTimeExpenseController),
);
router.use(
  "/expenses/installment",
  extractUser(userRepository),
  createInstallmentExpenseRoutes(installmentExpenseController),
);
router.use(
  "/expenses/recurring",
  extractUser(userRepository),
  createRecurringExpenseRoutes(recurringExpenseController),
);
router.use("/revenues/one-time", extractUser(userRepository), createOneTimeRevenueRoutes(oneTimeRevenueController));
router.use("/revenues/fixed", extractUser(userRepository), createFixedRevenueRoutes(fixedRevenueController));
router.use("/revenues", extractUser(userRepository), createRevenueQueryRoutes(revenueQueryController));
router.use("/expenses", extractUser(userRepository), createExpenseQueryRoutes(expenseQueryController));

export default router;
