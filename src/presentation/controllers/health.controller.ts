import { Request, Response } from "express";
import { getDatabaseStatus } from "../../infrastructure/database/config.ts";

export async function healthController(_req: Request, res: Response): Promise<void> {
  const dbStatus = await getDatabaseStatus();

  const payload: {
    status: "ok" | "degraded";
    timestamp: string;
    uptime: number;
    database: {
      status: "connected" | "disconnected";
      provider: string;
      error?: string;
    };
  } = {
    status: dbStatus.status === "connected" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus.status,
      provider: dbStatus.provider,
    },
  };

  if (dbStatus.error) {
    payload.database.error = dbStatus.error;
  }

  const httpStatus = dbStatus.status === "connected" ? 200 : 503;
  res.status(httpStatus).json(payload);
}
