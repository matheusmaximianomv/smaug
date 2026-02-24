import { Request, Response, NextFunction } from "express";
import { UserRepository } from "@src/domain/ports/user.repository";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export function extractUser(userRepository: UserRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.headers["x-user-id"];

    if (!userId || typeof userId !== "string") {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Header X-User-Id is required",
      });
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Header X-User-Id must be a valid UUID",
      });
      return;
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      res.status(404).json({
        error: "USER_NOT_FOUND",
        message: "User not found",
      });
      return;
    }

    req.userId = userId;
    next();
  };
}
