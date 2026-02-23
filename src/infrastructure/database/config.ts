import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    prismaClient = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL,
        },
      },
    });
  }
  return prismaClient;
}

export async function disconnectDatabase(): Promise<void> {
  if (prismaClient) {
    await prismaClient.$disconnect();
    prismaClient = null;
  }
}

export async function checkDatabaseConnection(): Promise<{
  status: "connected" | "disconnected";
  error?: string;
}> {
  if (env.DATABASE_PROVIDER === "memory") {
    return { status: "connected" };
  }

  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return { status: "connected" };
  } catch (error) {
    const message =
      error instanceof Error ? sanitizeError(error.message) : "Unknown database error";
    return { status: "disconnected", error: message };
  }
}

export async function getDatabaseStatus() {
  const base = { provider: env.DATABASE_PROVIDER } as const;
  const status = await checkDatabaseConnection();
  return { ...base, ...status };
}

function sanitizeError(message: string): string {
  const firstLine = message.split("\n")[0];
  return firstLine.replace(env.DATABASE_URL, "[redacted]");
}
