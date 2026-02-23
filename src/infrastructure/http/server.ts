import express, { Express } from "express";
import { requestLoggerMiddleware } from "@src/presentation/middlewares/request-logger.middleware.ts";
import { errorHandlerMiddleware } from "@src/presentation/middlewares/error-handler.middleware.ts";
import routes from "@src/presentation/routes/index.ts";

export function createHttpServer(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLoggerMiddleware);
  app.use(routes);
  app.use(errorHandlerMiddleware);

  return app;
}
