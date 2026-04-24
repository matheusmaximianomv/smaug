import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { CreateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/create-recurring-expense.use-case";
import { GetRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/get-recurring-expense.use-case";
import { ListRecurringExpensesUseCase } from "@src/domain/use-cases/recurring-expense/list-recurring-expenses.use-case";
import { UpdateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/update-recurring-expense.use-case";
import { TerminateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/terminate-recurring-expense.use-case";
import { DeleteRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/delete-recurring-expense.use-case";
import {
  CreateRecurringExpenseDto,
  UpdateRecurringExpenseDto,
  TerminateRecurringExpenseDto,
  RecurringExpenseResponseDto,
  RecurringExpenseVersionDto,
} from "@src/application/dtos/recurring-expense.dto";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

export class RecurringExpenseService {
  public constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
    private readonly createUseCase: CreateRecurringExpenseUseCase,
    private readonly getUseCase: GetRecurringExpenseUseCase,
    private readonly listUseCase: ListRecurringExpensesUseCase,
    private readonly updateUseCase: UpdateRecurringExpenseUseCase,
    private readonly terminateUseCase: TerminateRecurringExpenseUseCase,
    private readonly deleteUseCase: DeleteRecurringExpenseUseCase,
  ) {}

  public async create(
    userId: string,
    input: CreateRecurringExpenseDto,
  ): Promise<RecurringExpenseResponseDto> {
    const { expense, versions } = await this.createUseCase.execute({
      userId,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      startMonth: input.startMonth,
      startYear: input.startYear,
      endMonth: input.endMonth ?? null,
      endYear: input.endYear ?? null,
    });

    return this.toResponseDto(expense, versions);
  }

  public async get(userId: string, id: string): Promise<RecurringExpenseResponseDto> {
    const { expense, versions } = await this.getUseCase.execute({ id, userId });
    return this.toResponseDto(expense, versions);
  }

  public async list(userId: string): Promise<RecurringExpenseResponseDto[]> {
    const expenses = await this.listUseCase.execute({ userId });
    if (expenses.length === 0) {
      return [];
    }

    const versionsByExpense = await Promise.all(
      expenses.map((expense) => this.recurringExpenseRepository.findVersions(expense.id)),
    );

    return Promise.all(expenses.map((expense, index) => this.toResponseDto(expense, versionsByExpense[index])));
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateRecurringExpenseDto,
  ): Promise<RecurringExpenseResponseDto> {
    const { expense, versions } = await this.updateUseCase.execute({
      id,
      userId,
      description: input.description,
      amount: input.amount,
      categoryId: input.categoryId,
      effectiveMonth: input.effectiveMonth,
      effectiveYear: input.effectiveYear,
    });

    return this.toResponseDto(expense, versions);
  }

  public async terminate(
    userId: string,
    id: string,
    input: TerminateRecurringExpenseDto,
  ): Promise<RecurringExpenseResponseDto> {
    const { expense, versions } = await this.terminateUseCase.execute({
      id,
      userId,
      endMonth: input.endMonth,
      endYear: input.endYear,
    });

    return this.toResponseDto(expense, versions);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  private async toResponseDto(
    expense: RecurringExpense,
    versions: RecurringExpenseVersion[],
  ): Promise<RecurringExpenseResponseDto> {
    const sortedVersions = RecurringExpenseService.sortVersions(versions);
    const categoryMap = await this.loadCategories(sortedVersions, expense.userId);
    const currentVersion = sortedVersions[sortedVersions.length - 1];

    return {
      id: expense.id,
      userId: expense.userId,
      startYear: expense.startYear,
      startMonth: expense.startMonth,
      endYear: expense.endYear,
      endMonth: expense.endMonth,
      currentVersion: this.toVersionDto(currentVersion, categoryMap.get(currentVersion.categoryId)!),
      versions: sortedVersions.map((version) => this.toVersionDto(version, categoryMap.get(version.categoryId)!)),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private toVersionDto(version: RecurringExpenseVersion, category: ExpenseCategory): RecurringExpenseVersionDto {
    return {
      id: version.id,
      categoryId: version.categoryId,
      category: {
        id: category.id,
        name: category.name,
      },
      description: version.description,
      amount: version.amount,
      effectiveYear: version.effectiveYear,
      effectiveMonth: version.effectiveMonth,
      createdAt: version.createdAt.toISOString(),
    };
  }

  private async loadCategories(
    versions: RecurringExpenseVersion[],
    userId: string,
  ): Promise<Map<string, ExpenseCategory>> {
    const uniqueCategoryIds = [...new Set(versions.map((version) => version.categoryId))];
    const categories = await Promise.all(uniqueCategoryIds.map((id) => this.categoryRepository.findById(id)));

    const categoryMap = new Map<string, ExpenseCategory>();
    categories.forEach((category, index) => {
      const id = uniqueCategoryIds[index];
      if (!category || category.userId !== userId) {
        throw new ExpenseCategoryNotFoundError(id);
      }
      categoryMap.set(id, category);
    });

    return categoryMap;
  }

  private static sortVersions(versions: RecurringExpenseVersion[]): RecurringExpenseVersion[] {
    return [...versions].sort((a, b) => {
      const aValue = a.effectiveYear * 12 + a.effectiveMonth;
      const bValue = b.effectiveYear * 12 + b.effectiveMonth;
      return aValue - bValue;
    });
  }
}
