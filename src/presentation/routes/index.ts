import { Router } from "express";
import { healthController } from "@src/presentation/controllers/health.controller.ts";
import { userController, userRepository, oneTimeRevenueController, fixedRevenueController, revenueQueryController } from "@src/infrastructure/config/container";
import { createUserRoutes } from "@src/presentation/routes/user.routes";
import { createOneTimeRevenueRoutes } from "@src/presentation/routes/one-time-revenue.routes";
import { createFixedRevenueRoutes } from "@src/presentation/routes/fixed-revenue.routes";
import { createRevenueQueryRoutes } from "@src/presentation/routes/revenue-query.routes";
import { extractUser } from "@src/presentation/middlewares/extract-user.middleware";

const router = Router();

router.get("/health", healthController);
router.use("/users", createUserRoutes(userController));
router.use("/revenues/one-time", extractUser(userRepository), createOneTimeRevenueRoutes(oneTimeRevenueController));
router.use("/revenues/fixed", extractUser(userRepository), createFixedRevenueRoutes(fixedRevenueController));
router.use("/revenues", extractUser(userRepository), createRevenueQueryRoutes(revenueQueryController));

export default router;
