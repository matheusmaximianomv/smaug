import "reflect-metadata";
import { env } from "./infrastructure/config/env.js";
import { container } from "./infrastructure/config/container.js";
import { Logger } from "./application/ports/logger.interface.js";
import { createHttpServer } from "./infrastructure/http/server.js";

function bootstrap(): void {
  const logger = container.resolve<Logger>("Logger");
  const app = createHttpServer();
  const port = env.PORT ?? 3000;

  app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });
}

bootstrap();
