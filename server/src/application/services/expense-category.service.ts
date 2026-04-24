import { ExpenseCategoryResponseDto, CreateExpenseCategoryDto, UpdateExpenseCategoryDto } from "@src/application/dtos/expense-category.dto";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { CreateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/create-expense-category.use-case";
import { GetExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/get-expense-category.use-case";
import { ListExpenseCategoriesUseCase } from "@src/domain/use-cases/expense-category/list-expense-categories.use-case";
import { UpdateExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/update-expense-category.use-case";
import { DeleteExpenseCategoryUseCase } from "@src/domain/use-cases/expense-category/delete-expense-category.use-case";

export class ExpenseCategoryService {
  public constructor(
    private readonly createUseCase: CreateExpenseCategoryUseCase,
    private readonly getUseCase: GetExpenseCategoryUseCase,
    private readonly listUseCase: ListExpenseCategoriesUseCase,
    private readonly updateUseCase: UpdateExpenseCategoryUseCase,
    private readonly deleteUseCase: DeleteExpenseCategoryUseCase,
  ) {}

  public async create(userId: string, input: CreateExpenseCategoryDto): Promise<ExpenseCategoryResponseDto> {
    const category = await this.createUseCase.execute({ userId, ...input });
    return ExpenseCategoryService.toResponseDto(category);
  }

  public async getById(userId: string, id: string): Promise<ExpenseCategoryResponseDto> {
    const category = await this.getUseCase.execute({ userId, id });
    return ExpenseCategoryService.toResponseDto(category);
  }

  public async list(userId: string): Promise<ExpenseCategoryResponseDto[]> {
    const categories = await this.listUseCase.execute({ userId });
    return categories.map(ExpenseCategoryService.toResponseDto);
  }

  public async update(userId: string, id: string, input: UpdateExpenseCategoryDto): Promise<ExpenseCategoryResponseDto> {
    const category = await this.updateUseCase.execute({ userId, id, ...input });
    return ExpenseCategoryService.toResponseDto(category);
  }

  public async delete(userId: string, id: string): Promise<void> {
    await this.deleteUseCase.execute({ userId, id });
  }

  private static toResponseDto(category: ExpenseCategory): ExpenseCategoryResponseDto {
    return {
      id: category.id,
      userId: category.userId,
      name: category.name,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
