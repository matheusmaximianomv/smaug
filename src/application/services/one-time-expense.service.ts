import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import {
  CreateOneTimeExpenseUseCase,
  CreateOneTimeExpenseInput,
} from "@src/domain/use-cases/one-time-expense/create-one-time-expense.use-case";
import { DeleteOneTimeExpenseUseCase } from "@src/domain/use-cases/one-time-expense/delete-one-time-expense.use-case";
import {
  ListOneTimeExpensesUseCase,
  ListOneTimeExpensesInput,
} from "@src/domain/use-cases/one-time-expense/list-one-time-expenses.use-case";
import {
  UpdateOneTimeExpenseUseCase,
  UpdateOneTimeExpenseInput,
} from "@src/domain/use-cases/one-time-expense/update-one-time-expense.use-case";
import {
  CreateOneTimeExpenseDto,
  ListOneTimeExpenseQueryDto,
  OneTimeExpenseResponseDto,
  UpdateOneTimeExpenseDto,
} from "@src/application/dtos/one-time-expense.dto";
import { ExpenseCategoryNotFoundError } from "@src/domain/errors/domain-error";

export class OneTimeExpenseService {
  public constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly createUseCase: CreateOneTimeExpenseUseCase,
    private readonly listUseCase: ListOneTimeExpensesUseCase,
    private readonly updateUseCase: UpdateOneTimeExpenseUseCase,
    private readonly deleteUseCase: DeleteOneTimeExpenseUseCase,
  ) {}

  public async create(userId: string, input: CreateOneTimeExpenseDto): Promise<OneTimeExpenseResponseDto> {
    const expense = await this.createUseCase.execute({ ...input, userId } satisfies CreateOneTimeExpenseInput);
    return this.toResponseDto(expense);
  }

  public async list(
    userId: string,
    filters: ListOneTimeExpenseQueryDto,
  ): Promise<OneTimeExpenseResponseDto[]> {
    const expenses = await this.listUseCase.execute({
      userId,
      competenceYear: filters.competenceYear,
      competenceMonth: filters.competenceMonth,
    } satisfies ListOneTimeExpensesInput);

    const categoryMap = await this.loadCategories(expenses);

    return expenses.map((expense) => this.toResponseDtoWithCategory(expense, categoryMap.get(expense.categoryId)!));
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateOneTimeExpenseDto,
  ): Promise<OneTimeExpenseResponseDto> {
    const expense = await this.updateUseCase.execute({
      id,
      userId,
      categoryId: input.categoryId,
      description: input.description,
      amount: input.amount,
      competenceMonth: input.competenceMonth,
      competenceYear: input.competenceYear,
    } satisfies UpdateOneTimeExpenseInput);

    return this.toResponseDto(expense);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  private async toResponseDto(expense: OneTimeExpense): Promise<OneTimeExpenseResponseDto> {
    const category = await this.categoryRepository.findById(expense.categoryId);
    if (!category || category.userId !== expense.userId) {
      throw new ExpenseCategoryNotFoundError(expense.categoryId);
    }
    return this.toResponseDtoWithCategory(expense, category);
  }

  private toResponseDtoWithCategory(
    expense: OneTimeExpense,
    category: ExpenseCategory,
  ): OneTimeExpenseResponseDto {
    return {
      id: expense.id,
      userId: expense.userId,
      categoryId: expense.categoryId,
      category: {
        id: category.id,
        name: category.name,
      },
      description: expense.description,
      amount: expense.amount,
      competenceYear: expense.competenceYear,
      competenceMonth: expense.competenceMonth,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private async loadCategories(expenses: OneTimeExpense[]): Promise<Map<string, ExpenseCategory>> {
    const uniqueCategoryIds = [...new Set(expenses.map((expense) => expense.categoryId))];
    const categories = await Promise.all(uniqueCategoryIds.map((id) => this.categoryRepository.findById(id)));

    const categoryMap = new Map<string, ExpenseCategory>();

    categories.forEach((category, index) => {
      const id = uniqueCategoryIds[index];
      if (!category) {
        throw new ExpenseCategoryNotFoundError(id);
      }
      if (!expenses.some((expense) => expense.categoryId === id && expense.userId === category.userId)) {
        throw new ExpenseCategoryNotFoundError(id);
      }
      categoryMap.set(id, category);
    });

    return categoryMap;
  }
}
