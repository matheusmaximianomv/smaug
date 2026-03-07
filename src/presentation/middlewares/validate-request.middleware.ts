import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validateRequest(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formatted: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!formatted[key]) formatted[key] = [];
        formatted[key].push(issue.message);
      }
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: formatted,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const formatted: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "_root";
        if (!formatted[key]) formatted[key] = [];
        formatted[key].push(issue.message);
      }
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid query parameters",
        details: formatted,
      });
      return;
    }
    (req as Request & { validatedQuery: unknown }).validatedQuery = result.data;
    next();
  };
}
