import { PrismaClient } from "@prisma/client";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";

export class PrismaExpenseCategoryRepository implements ExpenseCategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<ExpenseCategory | null> {
    const record = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!record) return null;
    return PrismaExpenseCategoryRepository.toDomain(record);
  }

  public async findByNameLower(userId: string, nameLower: string): Promise<ExpenseCategory | null> {
    const record = await this.prisma.expenseCategory.findFirst({ where: { userId, nameLower } });
    if (!record) return null;
    return PrismaExpenseCategoryRepository.toDomain(record);
  }

  public async listByUser(userId: string): Promise<ExpenseCategory[]> {
    const records = await this.prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: [{ nameLower: "asc" }],
    });
    return records.map(PrismaExpenseCategoryRepository.toDomain);
  }

  public async create(category: ExpenseCategory): Promise<ExpenseCategory> {
    const record = await this.prisma.expenseCategory.create({
      data: {
        id: category.id,
        userId: category.userId,
        name: category.name,
        nameLower: category.nameLower,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
    });
    return PrismaExpenseCategoryRepository.toDomain(record);
  }

  public async update(category: ExpenseCategory): Promise<ExpenseCategory> {
    const record = await this.prisma.expenseCategory.update({
      where: { id: category.id },
      data: {
        name: category.name,
        nameLower: category.nameLower,
        updatedAt: category.updatedAt,
      },
    });
    return PrismaExpenseCategoryRepository.toDomain(record);
  }

  public async delete(id: string): Promise<void> {
    await this.prisma.expenseCategory.delete({ where: { id } });
  }

  public async hasLinkedExpenses(categoryId: string): Promise<boolean> {
    const [oneTimeExpenses, installmentExpenses, recurringVersions] = await Promise.all([
      this.prisma.oneTimeExpense.count({ where: { categoryId } }),
      this.prisma.installmentExpense.count({ where: { categoryId } }),
      this.prisma.recurringExpenseVersion.count({ where: { categoryId } }),
    ]);

    return oneTimeExpenses > 0 || installmentExpenses > 0 || recurringVersions > 0;
  }

  private static toDomain(record: {
    id: string;
    userId: string;
    name: string;
    nameLower: string;
    createdAt: Date;
    updatedAt: Date;
  }): ExpenseCategory {
    return ExpenseCategory.create({
      id: record.id,
      userId: record.userId,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
