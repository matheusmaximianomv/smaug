import { PrismaClient } from "@prisma/client";
import {
  RecurringExpense,
  type RecurringExpensePersistenceProps,
} from "@src/domain/entities/recurring-expense.entity";
import {
  RecurringExpenseVersion,
  type RecurringExpenseVersionPersistenceProps,
} from "@src/domain/entities/recurring-expense-version.entity";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";

export class PrismaRecurringExpenseRepository implements RecurringExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<RecurringExpense | null> {
    const record = await this.prisma.recurringExpense.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaRecurringExpenseRepository.toExpenseDomain(record);
  }

  public async findByIdWithVersions(
    id: string,
  ): Promise<{ expense: RecurringExpense; versions: RecurringExpenseVersion[] } | null> {
    const record = await this.prisma.recurringExpense.findUnique({
      where: { id },
      include: { versions: { orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }] } },
    });

    if (!record) return null;
    return {
      expense: PrismaRecurringExpenseRepository.toExpenseDomain(record),
      versions: record.versions.map(PrismaRecurringExpenseRepository.toVersionDomain),
    };
  }

  public async listByUser(userId: string): Promise<RecurringExpense[]> {
    const records = await this.prisma.recurringExpense.findMany({
      where: { userId },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
    return records.map(PrismaRecurringExpenseRepository.toExpenseDomain);
  }

  public async create(expense: RecurringExpense, initialVersion: RecurringExpenseVersion): Promise<RecurringExpense> {
    const record = await this.prisma.recurringExpense.create({
      data: {
        id: expense.id,
        userId: expense.userId,
        startMonth: expense.startMonth,
        startYear: expense.startYear,
        endMonth: expense.endMonth,
        endYear: expense.endYear,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        versions: {
          create: {
            id: initialVersion.id,
            categoryId: initialVersion.categoryId,
            description: initialVersion.description,
            amount: initialVersion.amount,
            effectiveMonth: initialVersion.effectiveMonth,
            effectiveYear: initialVersion.effectiveYear,
            createdAt: initialVersion.createdAt,
          },
        },
      },
    });

    return PrismaRecurringExpenseRepository.toExpenseDomain(record);
  }

  public async update(expense: RecurringExpense): Promise<RecurringExpense> {
    const record = await this.prisma.recurringExpense.update({
      where: { id: expense.id },
      data: {
        endMonth: expense.endMonth,
        endYear: expense.endYear,
        updatedAt: expense.updatedAt,
      },
    });

    return PrismaRecurringExpenseRepository.toExpenseDomain(record);
  }

  public async terminate(expense: RecurringExpense): Promise<RecurringExpense> {
    const record = await this.prisma.recurringExpense.update({
      where: { id: expense.id },
      data: {
        endMonth: expense.endMonth,
        endYear: expense.endYear,
        updatedAt: expense.updatedAt,
      },
    });

    return PrismaRecurringExpenseRepository.toExpenseDomain(record);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.recurringExpense.delete({ where: { id } });
  }

  public async addVersion(version: RecurringExpenseVersion): Promise<RecurringExpenseVersion> {
    const record = await this.prisma.recurringExpenseVersion.create({
      data: PrismaRecurringExpenseRepository.toVersionData(version),
    });

    return PrismaRecurringExpenseRepository.toVersionDomain(record);
  }

  public async findVersions(expenseId: string): Promise<RecurringExpenseVersion[]> {
    const records = await this.prisma.recurringExpenseVersion.findMany({
      where: { recurringExpenseId: expenseId },
      orderBy: [{ effectiveYear: "asc" }, { effectiveMonth: "asc" }],
    });
    return records.map(PrismaRecurringExpenseRepository.toVersionDomain);
  }

  public async findVersionForMonth(
    expenseId: string,
    year: number,
    month: number,
  ): Promise<RecurringExpenseVersion | null> {
    const versions = await this.prisma.recurringExpenseVersion.findMany({
      where: {
        recurringExpenseId: expenseId,
        OR: [
          { effectiveYear: { lt: year } },
          { effectiveYear: year, effectiveMonth: { lte: month } },
        ],
      },
      orderBy: [{ effectiveYear: "desc" }, { effectiveMonth: "desc" }],
      take: 1,
    });

    if (versions.length === 0) return null;
    return PrismaRecurringExpenseRepository.toVersionDomain(versions[0]);
  }

  public async findActiveForCompetence(userId: string, year: number, month: number): Promise<RecurringExpense[]> {
    const expenses = await this.prisma.recurringExpense.findMany({ where: { userId } });
    return expenses
      .map(PrismaRecurringExpenseRepository.toExpenseDomain)
      .filter((expense) => expense.isActiveForMonth(month, year));
  }

  private static toExpenseDomain(record: RecurringExpensePersistenceProps): RecurringExpense {
    return RecurringExpense.rehydrate(record);
  }

  private static toVersionDomain(record: RecurringExpenseVersionPersistenceProps): RecurringExpenseVersion {
    return RecurringExpenseVersion.rehydrate(record);
  }

  private static toVersionData(version: RecurringExpenseVersion): RecurringExpenseVersionPersistenceProps {
    return {
      id: version.id,
      recurringExpenseId: version.recurringExpenseId,
      categoryId: version.categoryId,
      description: version.description,
      amount: version.amount,
      effectiveMonth: version.effectiveMonth,
      effectiveYear: version.effectiveYear,
      createdAt: version.createdAt,
    };
  }
}
