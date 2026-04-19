import { PrismaClient } from "@prisma/client";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";

export class PrismaInstallmentExpenseRepository implements InstallmentExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<InstallmentExpense | null> {
    const record = await this.prisma.installmentExpense.findUnique({
      where: { id },
      include: { installments: { orderBy: [{ installmentNumber: "asc" }] } },
    });

    if (!record) return null;
    return PrismaInstallmentExpenseRepository.toExpenseDomain(record);
  }

  public async listByUser(userId: string): Promise<InstallmentExpense[]> {
    const records = await this.prisma.installmentExpense.findMany({
      where: { userId },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }, { createdAt: "desc" }],
    });
    return records.map(PrismaInstallmentExpenseRepository.toExpenseDomain);
  }

  public async findByCategoryId(categoryId: string): Promise<InstallmentExpense[]> {
    const records = await this.prisma.installmentExpense.findMany({
      where: { categoryId },
      orderBy: [{ startYear: "desc" }, { startMonth: "desc" }],
    });
    return records.map(PrismaInstallmentExpenseRepository.toExpenseDomain);
  }

  public async create(expense: InstallmentExpense, installments: Installment[]): Promise<InstallmentExpense> {
    const record = await this.prisma.installmentExpense.create({
      data: {
        id: expense.id,
        userId: expense.userId,
        categoryId: expense.categoryId,
        description: expense.description,
        totalAmount: expense.totalAmount,
        installmentCount: expense.installmentCount,
        startMonth: expense.startMonth,
        startYear: expense.startYear,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        installments: {
          create: installments.map((installment) => ({
            id: installment.id,
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            competenceMonth: installment.competenceMonth,
            competenceYear: installment.competenceYear,
            createdAt: installment.createdAt,
          })),
        },
      },
      include: { installments: { orderBy: [{ installmentNumber: "asc" }] } },
    });

    return PrismaInstallmentExpenseRepository.toExpenseDomain(record);
  }

  public async update(expense: InstallmentExpense): Promise<InstallmentExpense> {
    const record = await this.prisma.installmentExpense.update({
      where: { id: expense.id },
      data: {
        categoryId: expense.categoryId,
        description: expense.description,
        updatedAt: expense.updatedAt,
      },
      include: { installments: { orderBy: [{ installmentNumber: "asc" }] } },
    });

    return PrismaInstallmentExpenseRepository.toExpenseDomain(record);
  }

  public async updateInstallments(installments: Installment[]): Promise<void> {
    await this.prisma.$transaction(
      installments.map((installment) =>
        this.prisma.installment.update({
          where: { id: installment.id },
          data: {
            amount: installment.amount,
            competenceMonth: installment.competenceMonth,
            competenceYear: installment.competenceYear,
          },
        }),
      ),
    );
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.installmentExpense.delete({ where: { id } });
  }

  public async deleteFutureInstallments(expenseId: string, month: number, year: number): Promise<void> {
    await this.prisma.installment.deleteMany({
      where: {
        installmentExpenseId: expenseId,
        OR: [
          { competenceYear: { gt: year } },
          { competenceYear: year, competenceMonth: { gt: month } },
        ],
      },
    });
  }

  public async hasPastInstallments(expenseId: string, referenceMonth: number, referenceYear: number): Promise<boolean> {
    const count = await this.prisma.installment.count({
      where: {
        installmentExpenseId: expenseId,
        OR: [
          { competenceYear: { lt: referenceYear } },
          { competenceYear: referenceYear, competenceMonth: { lt: referenceMonth } },
        ],
      },
    });
    return count > 0;
  }

  public async findInstallmentsByExpense(expenseId: string): Promise<Installment[]> {
    const records = await this.prisma.installment.findMany({
      where: { installmentExpenseId: expenseId },
      orderBy: [{ installmentNumber: "asc" }],
    });
    return records.map(PrismaInstallmentExpenseRepository.toInstallmentDomain);
  }

  public async findInstallmentsByCompetence(
    userId: string,
    year: number,
    month: number,
  ): Promise<Installment[]> {
    const records = await this.prisma.installment.findMany({
      where: {
        competenceYear: year,
        competenceMonth: month,
        installmentExpense: { userId },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return records.map(PrismaInstallmentExpenseRepository.toInstallmentDomain);
  }

  private static toExpenseDomain(record: {
    id: string;
    userId: string;
    categoryId: string;
    description: string;
    totalAmount: number;
    installmentCount: number;
    startMonth: number;
    startYear: number;
    createdAt: Date;
    updatedAt: Date;
    installments?: Array<{
      id: string;
      installmentExpenseId: string;
      installmentNumber: number;
      amount: number;
      competenceMonth: number;
      competenceYear: number;
      createdAt: Date;
    }>;
  }): InstallmentExpense {
    const expense = InstallmentExpense.create({
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      description: record.description,
      totalAmount: record.totalAmount,
      installmentCount: record.installmentCount,
      startMonth: record.startMonth,
      startYear: record.startYear,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });

    return expense;
  }

  private static toInstallmentDomain(record: {
    id: string;
    installmentExpenseId: string;
    installmentNumber: number;
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    createdAt: Date;
  }): Installment {
    return Installment.create({
      id: record.id,
      installmentExpenseId: record.installmentExpenseId,
      installmentNumber: record.installmentNumber,
      amount: record.amount,
      competenceMonth: record.competenceMonth,
      competenceYear: record.competenceYear,
      createdAt: record.createdAt,
    });
  }
}
