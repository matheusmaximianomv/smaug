import { Request, Response, NextFunction } from "express";
import { container } from "../../infrastructure/config/container.js";
import { Logger } from "../../application/ports/logger.interface.js";

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
