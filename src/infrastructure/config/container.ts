import "reflect-metadata";
import { container } from "tsyringe";
import { PrismaClient } from "@prisma/client";
import { Logger } from "@src/application/ports/logger.interface.ts";
import { PinoLogger } from "@src/infrastructure/logging/logger.ts";
import {
  getRepository,
  RepositoryFactory,
} from "@src/infrastructure/database/database.provider.ts";
import { PrismaUserRepository } from "@src/infrastructure/database/repositories/prisma-user.repository";
import { UserRepository } from "@src/domain/ports/user.repository";
import { CreateUserUseCase } from "@src/domain/use-cases/user/create-user.use-case";
import { GetUserUseCase } from "@src/domain/use-cases/user/get-user.use-case";
import { UserService } from "@src/application/services/user.service";
import { UserController } from "@src/presentation/controllers/user.controller";
import { PrismaOneTimeRevenueRepository } from "@src/infrastructure/database/repositories/prisma-one-time-revenue.repository";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { CreateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/create-one-time-revenue.use-case";
import { UpdateOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/update-one-time-revenue.use-case";
import { DeleteOneTimeRevenueUseCase } from "@src/domain/use-cases/one-time-revenue/delete-one-time-revenue.use-case";
import { ListOneTimeRevenuesUseCase } from "@src/domain/use-cases/one-time-revenue/list-one-time-revenues.use-case";
import { OneTimeRevenueService } from "@src/application/services/one-time-revenue.service";
import { OneTimeRevenueController } from "@src/presentation/controllers/one-time-revenue.controller";
import { PrismaFixedRevenueRepository } from "@src/infrastructure/database/repositories/prisma-fixed-revenue.repository";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { CreateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/create-fixed-revenue.use-case";
import { DeleteFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/delete-fixed-revenue.use-case";
import { GetFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/get-fixed-revenue.use-case";
import { ListFixedRevenuesUseCase } from "@src/domain/use-cases/fixed-revenue/list-fixed-revenues.use-case";
import { UpdateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/update-fixed-revenue.use-case";
import { TerminateFixedRevenueUseCase } from "@src/domain/use-cases/fixed-revenue/terminate-fixed-revenue.use-case";
import { FixedRevenueService } from "@src/application/services/fixed-revenue.service";
import { FixedRevenueController } from "@src/presentation/controllers/fixed-revenue.controller";
import { RevenueQueryService } from "@src/application/services/revenue-query.service";
import { RevenueQueryController } from "@src/presentation/controllers/revenue-query.controller";

const prismaClient = new PrismaClient();

container.registerInstance<PrismaClient>("PrismaClient", prismaClient);
container.registerSingleton<Logger>("Logger", PinoLogger);
container.register<RepositoryFactory>("RepositoryFactory", { useValue: getRepository });

const userRepository: UserRepository = new PrismaUserRepository(prismaClient);
const createUserUseCase = new CreateUserUseCase(userRepository);
const getUserUseCase = new GetUserUseCase(userRepository);
const userService = new UserService(createUserUseCase, getUserUseCase);
const userController = new UserController(userService);

container.registerInstance<UserRepository>("UserRepository", userRepository);
container.registerInstance<UserService>("UserService", userService);
container.registerInstance<UserController>("UserController", userController);

const oneTimeRevenueRepository: OneTimeRevenueRepository = new PrismaOneTimeRevenueRepository(prismaClient);
const createOneTimeRevenueUseCase = new CreateOneTimeRevenueUseCase(oneTimeRevenueRepository);
const updateOneTimeRevenueUseCase = new UpdateOneTimeRevenueUseCase(oneTimeRevenueRepository);
const deleteOneTimeRevenueUseCase = new DeleteOneTimeRevenueUseCase(oneTimeRevenueRepository);
const listOneTimeRevenuesUseCase = new ListOneTimeRevenuesUseCase(oneTimeRevenueRepository);
const oneTimeRevenueService = new OneTimeRevenueService(
  createOneTimeRevenueUseCase,
  updateOneTimeRevenueUseCase,
  deleteOneTimeRevenueUseCase,
  listOneTimeRevenuesUseCase,
);
const oneTimeRevenueController = new OneTimeRevenueController(oneTimeRevenueService);

container.registerInstance<OneTimeRevenueRepository>("OneTimeRevenueRepository", oneTimeRevenueRepository);
container.registerInstance<OneTimeRevenueService>("OneTimeRevenueService", oneTimeRevenueService);
container.registerInstance<OneTimeRevenueController>("OneTimeRevenueController", oneTimeRevenueController);

const fixedRevenueRepository: FixedRevenueRepository = new PrismaFixedRevenueRepository(prismaClient);
const createFixedRevenueUseCase = new CreateFixedRevenueUseCase(fixedRevenueRepository);
const deleteFixedRevenueUseCase = new DeleteFixedRevenueUseCase(fixedRevenueRepository);
const getFixedRevenueUseCase = new GetFixedRevenueUseCase(fixedRevenueRepository);
const listFixedRevenuesUseCase = new ListFixedRevenuesUseCase(fixedRevenueRepository);
const updateFixedRevenueUseCase = new UpdateFixedRevenueUseCase(fixedRevenueRepository);
const terminateFixedRevenueUseCase = new TerminateFixedRevenueUseCase(fixedRevenueRepository);
const fixedRevenueService = new FixedRevenueService(
  createFixedRevenueUseCase,
  deleteFixedRevenueUseCase,
  getFixedRevenueUseCase,
  listFixedRevenuesUseCase,
  updateFixedRevenueUseCase,
  terminateFixedRevenueUseCase,
);
const fixedRevenueController = new FixedRevenueController(fixedRevenueService);

container.registerInstance<FixedRevenueRepository>("FixedRevenueRepository", fixedRevenueRepository);
container.registerInstance<FixedRevenueService>("FixedRevenueService", fixedRevenueService);
container.registerInstance<FixedRevenueController>("FixedRevenueController", fixedRevenueController);

const revenueQueryService = new RevenueQueryService(oneTimeRevenueRepository, fixedRevenueRepository);
const revenueQueryController = new RevenueQueryController(revenueQueryService);

container.registerInstance<RevenueQueryService>("RevenueQueryService", revenueQueryService);
container.registerInstance<RevenueQueryController>("RevenueQueryController", revenueQueryController);

export { container, userRepository, userController, oneTimeRevenueController, fixedRevenueController, fixedRevenueRepository, revenueQueryController };
