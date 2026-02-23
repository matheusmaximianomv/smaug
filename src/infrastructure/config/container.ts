import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { Logger } from "../../application/ports/logger.interface.ts";
import { PinoLogger } from "../logging/logger.ts";
import { getRepository, RepositoryFactory } from "../database/database.provider.ts";

const prismaClient = new PrismaClient();

container.registerInstance<PrismaClient>("PrismaClient", prismaClient);
container.registerSingleton<Logger>("Logger", PinoLogger);
container.register<RepositoryFactory>("RepositoryFactory", { useValue: getRepository });

export { container };
