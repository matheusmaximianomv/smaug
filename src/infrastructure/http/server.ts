import express, { Express } from "express";
import { requestLoggerMiddleware } from "../../presentation/middlewares/request-logger.middleware.ts";
import { errorHandlerMiddleware } from "../../presentation/middlewares/error-handler.middleware.ts";
import routes from "../../presentation/routes/index.ts";

export function createHttpServer(): Express {
  const app = express();

  app.use(express.json());
  app.use(requestLoggerMiddleware);
  app.use(routes);
  app.use(errorHandlerMiddleware);

  return app;
}
