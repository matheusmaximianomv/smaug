import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { UpdateRecurringExpenseUseCase } from "@src/domain/use-cases/recurring-expense/update-recurring-expense.use-case";
import type { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import type { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import {
  ExpenseCategoryNotFoundError,
  RecurringExpenseNotFoundError,
  PastEffectiveDateError,
  EffectiveDateOutOfRangeError,
} from "@src/domain/errors/domain-error";

const BASE_DATE = new Date("2026-03-01T00:00:00.000Z");

describe("UpdateRecurringExpenseUseCase", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let categoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: UpdateRecurringExpenseUseCase;
  let expense: RecurringExpense;
  let versions: RecurringExpenseVersion[];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    repository = {
      findById: vi.fn(),
      findByIdWithVersions: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      terminate: vi.fn(),
      delete: vi.fn(),
      addVersion: vi.fn(),
      findVersions: vi.fn(),
      findVersionForMonth: vi.fn(),
      findActiveForCompetence: vi.fn(),
    };

    categoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countLinkedExpenses: vi.fn(),
    };

    useCase = new UpdateRecurringExpenseUseCase(
      repository as unknown as RecurringExpenseRepository,
      categoryRepository as unknown as ExpenseCategoryRepository,
    );

    expense = RecurringExpense.create({
      id: "recurring-1",
      userId: "user-1",
      startMonth: 4,
      startYear: 2026,
    });

    versions = [
      RecurringExpenseVersion.create({
        recurringExpenseId: expense.id,
        categoryId: "category-1",
        description: "Aluguel",
        amount: 2000,
        effectiveMonth: 4,
        effectiveYear: 2026,
      }),
    ];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should create new version when valid update is provided", async () => {
    const category = ExpenseCategory.create({ id: "category-2", userId: "user-1", name: "Moradia" });
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(category);
    const createdVersion = RecurringExpenseVersion.create({
      recurringExpenseId: expense.id,
      categoryId: "category-2",
      description: "Aluguel reajustado",
      amount: 2100,
      effectiveMonth: 5,
      effectiveYear: 2026,
    });

    (repository.findVersions as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(versions)
      .mockResolvedValueOnce([...versions, createdVersion]);
    (repository.addVersion as ReturnType<typeof vi.fn>).mockResolvedValue(createdVersion);

    const result = await useCase.execute({
      id: expense.id,
      userId: "user-1",
      description: "Aluguel reajustado",
      amount: 2100,
      categoryId: "category-2",
      effectiveMonth: 5,
      effectiveYear: 2026,
    });

    expect(repository.addVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        recurringExpenseId: expense.id,
        categoryId: "category-2",
        description: "Aluguel reajustado",
        amount: 2100,
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    );
    expect(result.expense).toEqual(expense);
    expect(result.versions).toEqual([...versions, createdVersion]);
  });

  it("should throw RecurringExpenseNotFoundError when expense does not exist", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: "missing",
        userId: "user-1",
        description: "Aluguel",
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    ).rejects.toThrow(RecurringExpenseNotFoundError);
  });

  it("should throw ExpenseCategoryNotFoundError when new category is invalid", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (categoryRepository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      useCase.execute({
        id: expense.id,
        userId: "user-1",
        categoryId: "missing-category",
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    ).rejects.toThrow(ExpenseCategoryNotFoundError);
    expect(repository.addVersion).not.toHaveBeenCalled();
  });

  it("should throw PastEffectiveDateError when effective competence is in the past", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.findVersions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(versions);

    await expect(
      useCase.execute({
        id: expense.id,
        userId: "user-1",
        effectiveMonth: 2,
        effectiveYear: 2026,
        description: "Aluguel",
      }),
    ).rejects.toThrow(PastEffectiveDateError);
  });

  it("should throw EffectiveDateOutOfRangeError when effective competence before start", async () => {
    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(expense);
    (repository.findVersions as ReturnType<typeof vi.fn>).mockResolvedValue(versions);

    await expect(
      useCase.execute({
        id: expense.id,
        userId: "user-1",
        effectiveMonth: 3,
        effectiveYear: 2026,
        description: "Aluguel",
      }),
    ).rejects.toThrow(EffectiveDateOutOfRangeError);
  });

  it("should throw EffectiveDateOutOfRangeError when effective competence after termination", async () => {
    const terminatedExpense = RecurringExpense.create({
      id: "recurring-terminated",
      userId: "user-1",
      startMonth: 4,
      startYear: 2026,
      endMonth: 6,
      endYear: 2026,
    });

    (repository.findById as ReturnType<typeof vi.fn>).mockResolvedValue(terminatedExpense);
    (repository.findVersions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(versions);

    await expect(
      useCase.execute({
        id: terminatedExpense.id,
        userId: "user-1",
        effectiveMonth: 7,
        effectiveYear: 2026,
        description: "Aluguel",
      }),
    ).rejects.toThrow(EffectiveDateOutOfRangeError);
  });
});

describe("UpdateRecurringExpenseUseCase version resolution", () => {
  let repository: { [K in keyof RecurringExpenseRepository]: ReturnType<typeof vi.fn> };
  let categoryRepository: { [K in keyof ExpenseCategoryRepository]: ReturnType<typeof vi.fn> };
  let useCase: UpdateRecurringExpenseUseCase;
  let expense: RecurringExpense;

  const buildVersion = (overrides: {
    categoryId?: string;
    description?: string;
    amount?: number;
    effectiveMonth: number;
    effectiveYear: number;
  }) =>
    RecurringExpenseVersion.create({
      recurringExpenseId: "recurring-1",
      categoryId: overrides.categoryId ?? "category-1",
      description: overrides.description ?? "Aluguel",
      amount: overrides.amount ?? 2000,
      effectiveMonth: overrides.effectiveMonth,
      effectiveYear: overrides.effectiveYear,
    });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_DATE);

    repository = {
      findById: vi.fn(),
      findByIdWithVersions: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      terminate: vi.fn(),
      delete: vi.fn(),
      addVersion: vi.fn(),
      findVersions: vi.fn(),
      findVersionForMonth: vi.fn(),
      findActiveForCompetence: vi.fn(),
    };

    categoryRepository = {
      findById: vi.fn(),
      findByNameLower: vi.fn(),
      listByUser: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countLinkedExpenses: vi.fn(),
    };

    useCase = new UpdateRecurringExpenseUseCase(
      repository as unknown as RecurringExpenseRepository,
      categoryRepository as unknown as ExpenseCategoryRepository,
    );

    expense = RecurringExpense.create({
      id: "recurring-1",
      userId: "user-1",
      startMonth: 3,
      startYear: 2026,
    });

    repository.findById.mockResolvedValue(expense);
    repository.addVersion.mockImplementation(async (version) => version);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("should reject an update with no fields", async () => {
    await expect(
      useCase.execute({
        id: "recurring-1",
        userId: "user-1",
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    ).rejects.toThrow("At least one field must be provided");
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it("should inherit description and category from the latest applicable version", async () => {
    const older = buildVersion({ effectiveMonth: 3, effectiveYear: 2026 });
    const newer = buildVersion({
      categoryId: "category-9",
      description: "Aluguel reajustado",
      amount: 2500,
      effectiveMonth: 4,
      effectiveYear: 2026,
    });
    repository.findVersions.mockResolvedValue([newer, older]);

    const result = await useCase.execute({
      id: "recurring-1",
      userId: "user-1",
      amount: 2800,
      effectiveMonth: 5,
      effectiveYear: 2026,
    });

    const created = repository.addVersion.mock.calls[0][0] as RecurringExpenseVersion;
    expect(created.amount).toBe(2800);
    expect(created.description).toBe("Aluguel reajustado");
    expect(created.categoryId).toBe("category-9");
    expect(result.expense).toBe(expense);
  });

  it("should inherit amount and description when only the category changes", async () => {
    repository.findVersions.mockResolvedValue([
      buildVersion({ effectiveMonth: 3, effectiveYear: 2026 }),
    ]);
    categoryRepository.findById.mockResolvedValue(
      ExpenseCategory.create({ id: "category-2", userId: "user-1", name: "Moradia" }),
    );

    await useCase.execute({
      id: "recurring-1",
      userId: "user-1",
      categoryId: "category-2",
      effectiveMonth: 5,
      effectiveYear: 2026,
    });

    const created = repository.addVersion.mock.calls[0][0] as RecurringExpenseVersion;
    expect(created.categoryId).toBe("category-2");
    expect(created.description).toBe("Aluguel");
    expect(created.amount).toBe(2000);
  });

  it("should throw EffectiveDateOutOfRangeError when no version applies to the competence", async () => {
    repository.findVersions.mockResolvedValue([
      buildVersion({ effectiveMonth: 9, effectiveYear: 2026 }),
    ]);

    await expect(
      useCase.execute({
        id: "recurring-1",
        userId: "user-1",
        amount: 2800,
        effectiveMonth: 5,
        effectiveYear: 2026,
      }),
    ).rejects.toThrow(EffectiveDateOutOfRangeError);
    expect(repository.addVersion).not.toHaveBeenCalled();
  });
});
