import { PrismaClient } from "@prisma/client";
import { env } from "@src/infrastructure/config/env.ts";
import { createPrismaAdapter } from "@src/infrastructure/database/prisma-adapter.ts";

let prismaClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaClient) {
    // `memory` não tem banco, mas o container monta os repositórios Prisma mesmo assim;
    // o adapter SQLite só abre o arquivo na primeira query.
    const provider = env.DATABASE_PROVIDER === "postgresql" ? "postgresql" : "sqlite";
    prismaClient = new PrismaClient({ adapter: createPrismaAdapter(provider, env.DATABASE_URL) });
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
