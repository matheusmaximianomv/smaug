import { Request, Response, NextFunction } from "express";
import { container } from "@src/infrastructure/config/container.ts";
import { Logger } from "@src/application/ports/logger.interface.ts";

export function errorHandlerMiddleware(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const logger = container.resolve<Logger>("Logger");
  logger.error("Unhandled error", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  if (res.headersSent) {
    next(err);
    return;
  }

  res.status(500).json({ error: "Internal Server Error" });
}
