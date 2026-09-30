import cors from "cors";
import express, { Express } from "express";
import { env } from "@src/infrastructure/config/env.ts";
import { requestLoggerMiddleware } from "@src/presentation/middlewares/request-logger.middleware.ts";
import { errorHandlerMiddleware } from "@src/presentation/middlewares/error-handler.middleware.ts";
import routes from "@src/presentation/routes/index.ts";

export function createHttpServer(): Express {
  const app = express();

  // Content-Disposition é exposto para que o web leia dele o nome do arquivo exportado,
  // em vez de reimplementar a regra de nomeação do CSV.
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      exposedHeaders: ["Content-Disposition"],
    }),
  );
  app.use(express.json());
  // A importação recebe o CSV cru; evita a dependência de multipart só para um arquivo de texto.
  app.use(express.text({ type: "text/csv", limit: "5mb" }));
  app.use(requestLoggerMiddleware);
  app.use(routes);
  app.use(errorHandlerMiddleware);

  return app;
}
