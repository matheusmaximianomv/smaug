import "reflect-metadata";
import { env } from "./infrastructure/config/env.ts";
import { container } from "./infrastructure/config/container.ts";
import { Logger } from "./application/ports/logger.interface.ts";
import { createHttpServer } from "./infrastructure/http/server.ts";

function bootstrap(): void {
  const logger = container.resolve<Logger>("Logger");
  const app = createHttpServer();
  const port = env.PORT ?? 3000;

  app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });
}

bootstrap();
