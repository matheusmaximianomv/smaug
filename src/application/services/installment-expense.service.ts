import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
} from "@src/domain/errors/domain-error";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { CreateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/create-installment-expense.use-case";
import { GetInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/get-installment-expense.use-case";
import { ListInstallmentExpensesUseCase } from "@src/domain/use-cases/installment-expense/list-installment-expenses.use-case";
import { UpdateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/update-installment-expense.use-case";
import { TerminateInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/terminate-installment-expense.use-case";
import { DeleteInstallmentExpenseUseCase } from "@src/domain/use-cases/installment-expense/delete-installment-expense.use-case";
import {
  CreateInstallmentExpenseDto,
  InstallmentExpenseResponseDto,
  InstallmentDto,
  UpdateInstallmentExpenseDto,
} from "@src/application/dtos/installment-expense.dto";

export class InstallmentExpenseService {
  public constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly listUseCase: ListInstallmentExpensesUseCase,
    private readonly createUseCase: CreateInstallmentExpenseUseCase,
    private readonly getUseCase: GetInstallmentExpenseUseCase,
    private readonly updateUseCase: UpdateInstallmentExpenseUseCase,
    private readonly terminateUseCase: TerminateInstallmentExpenseUseCase,
    private readonly deleteUseCase: DeleteInstallmentExpenseUseCase,
  ) {}

  public async create(
    userId: string,
    input: CreateInstallmentExpenseDto,
  ): Promise<InstallmentExpenseResponseDto> {
    const { expense, installments } = await this.createUseCase.execute({ ...input, userId });
    return this.toResponseDto(expense, installments);
  }

  public async get(userId: string, id: string): Promise<InstallmentExpenseResponseDto> {
    const { expense, installments } = await this.getUseCase.execute({ id, userId });
    return this.toResponseDto(expense, installments);
  }

  public async list(userId: string): Promise<InstallmentExpenseResponseDto[]> {
    const expenses = await this.listUseCase.execute({ userId });
    if (expenses.length === 0) {
      return [];
    }

    const [categoryMap, installmentsMap] = await Promise.all([
      this.loadCategories(expenses),
      this.loadInstallments(expenses),
    ]);

    return expenses.map((expense) =>
      this.toResponseDtoWithCategory(
        expense,
        installmentsMap.get(expense.id) ?? [],
        categoryMap.get(expense.categoryId)!,
      ),
    );
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateInstallmentExpenseDto,
  ): Promise<InstallmentExpenseResponseDto> {
    const { expense, installments } = await this.updateUseCase.execute({
      id,
      userId,
      description: input.description,
      categoryId: input.categoryId,
    });
    return this.toResponseDto(expense, installments);
  }

  public async terminate(userId: string, id: string): Promise<InstallmentExpenseResponseDto> {
    const { expense, installments } = await this.terminateUseCase.execute({ id, userId });
    return this.toResponseDto(expense, installments);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ id, userId });
  }

  private async toResponseDto(
    expense: InstallmentExpense,
    installments: Installment[],
  ): Promise<InstallmentExpenseResponseDto> {
    const category = await this.categoryRepository.findById(expense.categoryId);
    if (!category || category.userId !== expense.userId) {
      throw new ExpenseCategoryNotFoundError(expense.categoryId);
    }

    return this.toResponseDtoWithCategory(expense, installments, category);
  }

  private toResponseDtoWithCategory(
    expense: InstallmentExpense,
    installments: Installment[],
    category: ExpenseCategory,
  ): InstallmentExpenseResponseDto {
    return {
      id: expense.id,
      userId: expense.userId,
      categoryId: expense.categoryId,
      category: {
        id: category.id,
        name: category.name,
      },
      description: expense.description,
      totalAmount: expense.totalAmount,
      installmentCount: expense.installmentCount,
      startYear: expense.startYear,
      startMonth: expense.startMonth,
      installments: installments.map(InstallmentExpenseService.toInstallmentDto),
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private async loadCategories(expenses: InstallmentExpense[]): Promise<Map<string, ExpenseCategory>> {
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

  private async loadInstallments(
    expenses: InstallmentExpense[],
  ): Promise<Map<string, Installment[]>> {
    const pairs = await Promise.all(
      expenses.map(async (expense) => {
        const installments = await this.installmentExpenseRepository.findInstallmentsByExpense(expense.id);
        return [expense.id, installments] as const;
      }),
    );

    return new Map<string, Installment[]>(pairs);
  }

  private static toInstallmentDto(installment: Installment): InstallmentDto {
    return {
      id: installment.id,
      installmentNumber: installment.installmentNumber,
      amount: installment.amount,
      competenceYear: installment.competenceYear,
      competenceMonth: installment.competenceMonth,
      createdAt: installment.createdAt.toISOString(),
    };
  }
}
