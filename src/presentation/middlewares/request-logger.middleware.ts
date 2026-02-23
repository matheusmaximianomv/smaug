import { Request, Response, NextFunction } from "express";
import { container } from "@src/infrastructure/config/container.ts";
import { Logger } from "@src/application/ports/logger.interface.ts";

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = container.resolve<Logger>("Logger");
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const responseTime = Number(end - start) / 1_000_000; // ms
    logger.info("HTTP request", {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime,
    });
  });

  next();
}
