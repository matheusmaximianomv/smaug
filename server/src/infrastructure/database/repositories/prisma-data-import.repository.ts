import { PrismaClient } from "@prisma/client";
import { DataImportRepository, ImportPayload } from "@src/domain/ports/data-import.repository";

export class PrismaDataImportRepository implements DataImportRepository {
  constructor(private readonly prisma: PrismaClient) {}

  public async persist(payload: ImportPayload): Promise<void> {
    // Uma transação só: sem deduplicação, uma gravação parcial não pode ser repetida com segurança.
    // As categorias entram primeiro porque as despesas do mesmo lote apontam para elas.
    await this.prisma.$transaction(async (tx) => {
      for (const category of payload.categories) {
        await tx.expenseCategory.create({
          data: {
            id: category.id,
            userId: category.userId,
            name: category.name,
            nameLower: category.nameLower,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
          },
        });
      }

      for (const revenue of payload.oneTimeRevenues) {
        await tx.oneTimeRevenue.create({
          data: {
            id: revenue.id,
            userId: revenue.userId,
            description: revenue.description,
            amount: revenue.amount,
            competenceMonth: revenue.competenceMonth,
            competenceYear: revenue.competenceYear,
            createdAt: revenue.createdAt,
            updatedAt: revenue.updatedAt,
          },
        });
      }

      for (const { revenue, versions } of payload.fixedRevenues) {
        await tx.fixedRevenue.create({
          data: {
            id: revenue.id,
            userId: revenue.userId,
            modality: revenue.modality,
            startMonth: revenue.startMonth,
            startYear: revenue.startYear,
            endMonth: revenue.endMonth,
            endYear: revenue.endYear,
            createdAt: revenue.createdAt,
            updatedAt: revenue.updatedAt,
            versions: {
              create: versions.map((version) => ({
                id: version.id,
                description: version.description,
                amount: version.amount,
                effectiveMonth: version.effectiveMonth,
                effectiveYear: version.effectiveYear,
                createdAt: version.createdAt,
              })),
            },
          },
        });
      }

      for (const expense of payload.oneTimeExpenses) {
        await tx.oneTimeExpense.create({
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
      }

      for (const { expense, installments } of payload.installmentExpenses) {
        await tx.installmentExpense.create({
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
        });
      }

      for (const { expense, versions } of payload.recurringExpenses) {
        await tx.recurringExpense.create({
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
              create: versions.map((version) => ({
                id: version.id,
                categoryId: version.categoryId,
                description: version.description,
                amount: version.amount,
                effectiveMonth: version.effectiveMonth,
                effectiveYear: version.effectiveYear,
                createdAt: version.createdAt,
              })),
            },
          },
        });
      }
    });
  }
}
