import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { Logger } from "../../application/ports/logger.interface.js";
import { PinoLogger } from "../logging/logger.js";
import { getRepository, RepositoryFactory } from "../database/database.provider.js";

const prismaClient = new PrismaClient();

container.registerInstance<PrismaClient>("PrismaClient", prismaClient);
container.registerSingleton<Logger>("Logger", PinoLogger);
container.register<RepositoryFactory>("RepositoryFactory", { useValue: getRepository });

export { container };
