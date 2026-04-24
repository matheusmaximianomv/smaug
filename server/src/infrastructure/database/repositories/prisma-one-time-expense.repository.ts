import { PrismaClient } from "@prisma/client";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";

export class PrismaOneTimeExpenseRepository implements OneTimeExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<OneTimeExpense | null> {
    const record = await this.prisma.oneTimeExpense.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaOneTimeExpenseRepository.toDomain(record);
  }

  public async findAllByUser(userId: string): Promise<OneTimeExpense[]> {
    const records = await this.prisma.oneTimeExpense.findMany({
      where: { userId },
      orderBy: [
        { competenceYear: "desc" },
        { competenceMonth: "desc" },
        { createdAt: "desc" },
      ],
    });
    return records.map(PrismaOneTimeExpenseRepository.toDomain);
  }

  public async findByUserAndCompetence(userId: string, year: number, month: number): Promise<OneTimeExpense[]> {
    const records = await this.prisma.oneTimeExpense.findMany({
      where: { userId, competenceYear: year, competenceMonth: month },
      orderBy: [{ createdAt: "desc" }],
    });
    return records.map(PrismaOneTimeExpenseRepository.toDomain);
  }

  public async findByCategoryId(categoryId: string): Promise<OneTimeExpense[]> {
    const records = await this.prisma.oneTimeExpense.findMany({
      where: { categoryId },
      orderBy: [{ competenceYear: "desc" }, { competenceMonth: "desc" }],
    });
    return records.map(PrismaOneTimeExpenseRepository.toDomain);
  }

  public async create(expense: OneTimeExpense): Promise<OneTimeExpense> {
    const record = await this.prisma.oneTimeExpense.create({
      data: {
        id: expense.id,
        userId: expense.userId,
        categoryId: expense.categoryId,
        description: expense.description,
        amount: expense.amount,
        competenceMonth: expense.competenceMonth,
        competenceYear: expense.competenceYear,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
      },
    });
    return PrismaOneTimeExpenseRepository.toDomain(record);
  }

  public async update(expense: OneTimeExpense): Promise<OneTimeExpense> {
    const record = await this.prisma.oneTimeExpense.update({
      where: { id: expense.id },
      data: {
        categoryId: expense.categoryId,
        description: expense.description,
        amount: expense.amount,
        competenceMonth: expense.competenceMonth,
        competenceYear: expense.competenceYear,
        updatedAt: expense.updatedAt,
      },
    });
    return PrismaOneTimeExpenseRepository.toDomain(record);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.oneTimeExpense.delete({ where: { id } });
  }

  private static toDomain(record: {
    id: string;
    userId: string;
    categoryId: string;
    description: string;
    amount: number;
    competenceMonth: number;
    competenceYear: number;
    createdAt: Date;
    updatedAt: Date;
  }): OneTimeExpense {
    return OneTimeExpense.create({
      id: record.id,
      userId: record.userId,
      categoryId: record.categoryId,
      description: record.description,
      amount: record.amount,
      competenceMonth: record.competenceMonth,
      competenceYear: record.competenceYear,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
