import { Request, Response, NextFunction } from "express";
import { container } from "../../infrastructure/config/container.js";
import { Logger } from "../../application/ports/logger.interface.js";

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
