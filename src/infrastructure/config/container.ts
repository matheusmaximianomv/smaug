import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { Logger } from "@src/application/ports/logger.interface.ts";
import { PinoLogger } from "@src/infrastructure/logging/logger.ts";
import {
  getRepository,
  RepositoryFactory,
} from "@src/infrastructure/database/database.provider.ts";

const prismaClient = new PrismaClient();

container.registerInstance<PrismaClient>("PrismaClient", prismaClient);
container.registerSingleton<Logger>("Logger", PinoLogger);
container.register<RepositoryFactory>("RepositoryFactory", { useValue: getRepository });

export { container };
