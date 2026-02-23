import "reflect-metadata";
import { env } from "@src/infrastructure/config/env.ts";
import { container } from "@src/infrastructure/config/container.ts";
import { Logger } from "@src/application/ports/logger.interface.ts";
import { createHttpServer } from "@src/infrastructure/http/server.ts";

function bootstrap(): void {
  const logger = container.resolve<Logger>("Logger");
  const app = createHttpServer();
  const port = env.PORT ?? 3000;

  app.listen(port, () => {
    logger.info(`HTTP server listening on port ${port}`);
  });
}

bootstrap();
