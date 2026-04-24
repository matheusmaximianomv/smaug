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
import { PrismaOneTimeExpenseRepository } from "@src/infrastructure/database/repositories/prisma-one-time-expense.repository";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { CreateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/create-one-time-expense.use-case";
import { ListOneTimeExpensesUseCase } from "@src/domain/use-cases/one-time-expense/list-one-time-expenses.use-case";
import { UpdateOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/update-one-time-expense.use-case";
import { DeleteOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/delete-one-time-expense.use-case";
import { OneTimeExpenseService } from "@src/application/services/one-time-expense.service";
import { OneTimeExpenseController } from "@src/presentation/controllers/one-time-expense.controller";
import { PrismaInstallmentExpenseRepository } from "@src/infrastructure/database/repositories/prisma-installment-expense.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { CreateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/create-installment-expense.use-case";
import { GetInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/get-installment-expense.use-case";
import { ListInstallmentExpensesUseCase } from "@src/domain/use-cases/installment-expense/list-installment-expenses.use-case";
import { UpdateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/update-installment-expense.use-case";
import { TerminateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/terminate-installment-expense.use-case";
import { DeleteInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/delete-installment-expense.use-case";
import { InstallmentExpenseService } from "@src/application/services/installment-expense.service";
import { InstallmentExpenseController } from "@src/presentation/controllers/installment-expense.controller";
import { PrismaRecurringExpenseRepository } from "@src/infrastructure/database/repositories/prisma-recurring-expense.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { CreateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/create-recurring-expense.use-case";
import { GetRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/get-recurring-expense.use-case";
import { ListRecurringExpensesUseCase } from "@src/domain/use-cases/recurring-expense/list-recurring-expenses.use-case";
import { UpdateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/update-recurring-expense.use-case";
import { TerminateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/terminate-recurring-expense.use-case";
import { DeleteRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/delete-recurring-expense.use-case";
import { RecurringExpenseService } from "@src/application/services/recurring-expense.service";
import { RecurringExpenseController } from "@src/presentation/controllers/recurring-expense.controller";
import { PrismaExpenseCategoryRepository } from "@src/infrastructure/database/repositories/prisma-expense-category.repository";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { CreateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/create-expense-category.use-case";
import { GetExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/get-expense-category.use-case";
import { ListExpenseCategoriesUseCase } from "@src/domain/use-cases/expense-category/list-expense-categories.use-case";
import { UpdateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/update-expense-category.use-case";
import { DeleteExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/delete-expense-category.use-case";
import { ExpenseCategoryService } from "@src/application/services/expense-category.service";
import { ExpenseCategoryController } from "@src/presentation/controllers/expense-category.controller";
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
import { ExpenseQueryService } from "@src/application/services/expense-query.service";
import { ExpenseQueryController } from "@src/presentation/controllers/expense-query.controller";

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

const expenseCategoryRepository: ExpenseCategoryRepository = new PrismaExpenseCategoryRepository(prismaClient);
const createExpenseCategoryUseCase = new CreateExpenseCategoryUseCase(expenseCategoryRepository);
const getExpenseCategoryUseCase = new GetExpenseCategoryUseCase(expenseCategoryRepository);
const listExpenseCategoriesUseCase = new ListExpenseCategoriesUseCase(expenseCategoryRepository);
const updateExpenseCategoryUseCase = new UpdateExpenseCategoryUseCase(expenseCategoryRepository);
const deleteExpenseCategoryUseCase = new DeleteExpenseCategoryUseCase(expenseCategoryRepository);
const expenseCategoryService = new ExpenseCategoryService(
  createExpenseCategoryUseCase,
  getExpenseCategoryUseCase,
  listExpenseCategoriesUseCase,
  updateExpenseCategoryUseCase,
  deleteExpenseCategoryUseCase,
);
const expenseCategoryController = new ExpenseCategoryController(expenseCategoryService);

container.registerInstance<ExpenseCategoryRepository>("ExpenseCategoryRepository", expenseCategoryRepository);
container.registerInstance<ExpenseCategoryService>("ExpenseCategoryService", expenseCategoryService);
container.registerInstance<ExpenseCategoryController>("ExpenseCategoryController", expenseCategoryController);

const oneTimeExpenseRepository: OneTimeExpenseRepository = new PrismaOneTimeExpenseRepository(prismaClient);
const createOneTimeExpenseUseCase = new CreateOneTimeExpenseUseCase(
  oneTimeExpenseRepository,
  expenseCategoryRepository,
);
const listOneTimeExpensesUseCase = new ListOneTimeExpensesUseCase(oneTimeExpenseRepository);
const updateOneTimeExpenseUseCase = new UpdateOneTimeExpenseUseCase(
  oneTimeExpenseRepository,
  expenseCategoryRepository,
);
const deleteOneTimeExpenseUseCase = new DeleteOneTimeExpenseUseCase(oneTimeExpenseRepository);
const oneTimeExpenseService = new OneTimeExpenseService(
  expenseCategoryRepository,
  createOneTimeExpenseUseCase,
  listOneTimeExpensesUseCase,
  updateOneTimeExpenseUseCase,
  deleteOneTimeExpenseUseCase,
);
const oneTimeExpenseController = new OneTimeExpenseController(oneTimeExpenseService);

container.registerInstance<OneTimeExpenseRepository>("OneTimeExpenseRepository", oneTimeExpenseRepository);
container.registerInstance<OneTimeExpenseService>("OneTimeExpenseService", oneTimeExpenseService);
container.registerInstance<OneTimeExpenseController>("OneTimeExpenseController", oneTimeExpenseController);

const installmentExpenseRepository: InstallmentExpenseRepository = new PrismaInstallmentExpenseRepository(prismaClient);
const listInstallmentExpensesUseCase = new ListInstallmentExpensesUseCase(installmentExpenseRepository);
const createInstallmentExpenseUseCase = new CreateInstallmentExpenseUseCase(
  installmentExpenseRepository,
  expenseCategoryRepository,
);
const getInstallmentExpenseUseCase = new GetInstallmentExpenseUseCase(installmentExpenseRepository);
const updateInstallmentExpenseUseCase = new UpdateInstallmentExpenseUseCase(
  installmentExpenseRepository,
  expenseCategoryRepository,
);
const terminateInstallmentExpenseUseCase = new TerminateInstallmentExpenseUseCase(installmentExpenseRepository);
const deleteInstallmentExpenseUseCase = new DeleteInstallmentExpenseUseCase(installmentExpenseRepository);
const installmentExpenseService = new InstallmentExpenseService(
  expenseCategoryRepository,
  installmentExpenseRepository,
  listInstallmentExpensesUseCase,
  createInstallmentExpenseUseCase,
  getInstallmentExpenseUseCase,
  updateInstallmentExpenseUseCase,
  terminateInstallmentExpenseUseCase,
  deleteInstallmentExpenseUseCase,
);
const installmentExpenseController = new InstallmentExpenseController(installmentExpenseService);

container.registerInstance<InstallmentExpenseRepository>(
  "InstallmentExpenseRepository",
  installmentExpenseRepository,
);
container.registerInstance<InstallmentExpenseService>("InstallmentExpenseService", installmentExpenseService);
container.registerInstance<InstallmentExpenseController>("InstallmentExpenseController", installmentExpenseController);

const recurringExpenseRepository: RecurringExpenseRepository = new PrismaRecurringExpenseRepository(prismaClient);
const createRecurringExpenseUseCase = new CreateRecurringExpenseUseCase(
  recurringExpenseRepository,
  expenseCategoryRepository,
);
const getRecurringExpenseUseCase = new GetRecurringExpenseUseCase(recurringExpenseRepository);
const listRecurringExpensesUseCase = new ListRecurringExpensesUseCase(recurringExpenseRepository);
const updateRecurringExpenseUseCase = new UpdateRecurringExpenseUseCase(
  recurringExpenseRepository,
  expenseCategoryRepository,
);
const terminateRecurringExpenseUseCase = new TerminateRecurringExpenseUseCase(recurringExpenseRepository);
const deleteRecurringExpenseUseCase = new DeleteRecurringExpenseUseCase(recurringExpenseRepository);
const recurringExpenseService = new RecurringExpenseService(
  expenseCategoryRepository,
  recurringExpenseRepository,
  createRecurringExpenseUseCase,
  getRecurringExpenseUseCase,
  listRecurringExpensesUseCase,
  updateRecurringExpenseUseCase,
  terminateRecurringExpenseUseCase,
  deleteRecurringExpenseUseCase,
);
const recurringExpenseController = new RecurringExpenseController(recurringExpenseService);

container.registerInstance<RecurringExpenseRepository>("RecurringExpenseRepository", recurringExpenseRepository);
container.registerInstance<RecurringExpenseService>("RecurringExpenseService", recurringExpenseService);
container.registerInstance<RecurringExpenseController>("RecurringExpenseController", recurringExpenseController);

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

const expenseQueryService = new ExpenseQueryService(
  expenseCategoryRepository,
  oneTimeExpenseRepository,
  installmentExpenseRepository,
  recurringExpenseRepository,
);
const expenseQueryController = new ExpenseQueryController(expenseQueryService);

container.registerInstance<ExpenseQueryService>("ExpenseQueryService", expenseQueryService);
container.registerInstance<ExpenseQueryController>("ExpenseQueryController", expenseQueryController);

export {
  container,
  userRepository,
  userController,
  oneTimeRevenueController,
  oneTimeExpenseController,
  installmentExpenseController,
  recurringExpenseController,
  fixedRevenueController,
  fixedRevenueRepository,
  revenueQueryController,
  expenseQueryController,
  expenseCategoryController,
  expenseCategoryRepository,
};
