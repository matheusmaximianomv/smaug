import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import {
  ExpenseCategoryNotFoundError,
  InstallmentExpenseNotFoundError,
  RecurringExpenseNotFoundError,
} from "@src/domain/errors/domain-error";
import {
  ExpenseQueryDto,
  ExpenseQueryResponseDto,
  ExpenseQueryItemDto,
  OneTimeExpenseItemDto,
  InstallmentExpenseItemDto,
  RecurringExpenseItemDto,
  ExpenseYearSummaryResponseDto,
} from "@src/application/dtos/expense-query.dto";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { toReferenceDto } from "@src/application/dtos/competence.dto";

const CENTS_FACTOR = 100;
const MONTHS_IN_YEAR = 12;

interface RecurringForMonth {
  expense: RecurringExpense;
  version: RecurringExpenseVersion;
  previousAmount: number | null;
}

export class ExpenseQueryService {
  public constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly oneTimeExpenseRepository: OneTimeExpenseRepository,
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
  ) {}

  public async getConsolidatedExpenses(
    userId: string,
    query: ExpenseQueryDto,
  ): Promise<ExpenseQueryResponseDto> {
    const { competenceYear, competenceMonth } = query;

    const [oneTimeExpenses, installments, recurringExpenses] = await Promise.all([
      this.oneTimeExpenseRepository.findByUserAndCompetence(
        userId,
        competenceYear,
        competenceMonth,
      ),
      this.installmentExpenseRepository.findInstallmentsByCompetence(
        userId,
        competenceYear,
        competenceMonth,
      ),
      this.recurringExpenseRepository.findActiveForCompetence(
        userId,
        competenceYear,
        competenceMonth,
      ),
    ]);

    const installmentParents = await this.loadInstallmentParents(installments, userId);
    const recurringWithVersions = await this.loadRecurringVersions(
      recurringExpenses,
      competenceYear,
      competenceMonth,
    );

    const categoryIds = new Set<string>();

    oneTimeExpenses.forEach((expense) => categoryIds.add(expense.categoryId));
    for (const parent of installmentParents.values()) {
      categoryIds.add(parent.categoryId);
    }
    recurringWithVersions.forEach(({ version }) => categoryIds.add(version.categoryId));

    const categoryMap = await this.loadCategories([...categoryIds], userId);

    const items: ExpenseQueryItemDto[] = [
      ...oneTimeExpenses.map((expense) =>
        this.toOneTimeExpenseDto(expense, categoryMap.get(expense.categoryId)!),
      ),
      ...installments.map((installment) =>
        this.toInstallmentExpenseDto(
          installment,
          this.getInstallmentParent(installmentParents, installment),
          this.getInstallmentCategory(categoryMap, installmentParents, installment),
        ),
      ),
      ...recurringWithVersions.map(({ expense, version, previousAmount }) =>
        this.toRecurringExpenseDto(
          expense,
          version,
          previousAmount,
          categoryMap.get(version.categoryId)!,
        ),
      ),
    ];

    const oneTimeTotal = ExpenseQueryService.round(
      oneTimeExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    );
    const installmentTotal = ExpenseQueryService.round(
      installments.reduce((sum, installment) => sum + installment.amount, 0),
    );
    const recurringTotal = ExpenseQueryService.round(
      recurringWithVersions.reduce((sum, { version }) => sum + version.amount, 0),
    );
    const total = ExpenseQueryService.round(oneTimeTotal + installmentTotal + recurringTotal);

    return {
      competenceYear,
      competenceMonth,
      competenceStatus: MonthlyCompetence.create(competenceMonth, competenceYear).statusAt(),
      reference: toReferenceDto(MonthlyCompetence.current()),
      expenses: items,
      totals: {
        oneTime: oneTimeTotal,
        installment: installmentTotal,
        recurring: recurringTotal,
        total,
      },
    };
  }

  /**
   * Reaproveita a consulta mensal para os 12 meses (mesmo padrão do
   * `DataExportService`): a faixa anual soma igual à tela e ao Dashboard por
   * construção. Otimizar com consulta por intervalo só com medição que justifique.
   */
  public async getYearSummary(
    userId: string,
    year: number,
  ): Promise<ExpenseYearSummaryResponseDto> {
    const months = await Promise.all(
      Array.from({ length: MONTHS_IN_YEAR }, (_, index) =>
        this.getConsolidatedExpenses(userId, { competenceYear: year, competenceMonth: index + 1 }),
      ),
    );
    return {
      year,
      reference: toReferenceDto(MonthlyCompetence.current()),
      months: months.map((month) => ({
        month: month.competenceMonth,
        competenceStatus: month.competenceStatus,
        totals: month.totals,
      })),
    };
  }

  private async loadInstallmentParents(
    installments: Installment[],
    userId: string,
  ): Promise<Map<string, InstallmentExpense>> {
    if (installments.length === 0) {
      return new Map();
    }

    const uniqueIds = [
      ...new Set(installments.map((installment) => installment.installmentExpenseId)),
    ];
    const parents = await Promise.all(
      uniqueIds.map((id) => this.installmentExpenseRepository.findById(id)),
    );

    const map = new Map<string, InstallmentExpense>();
    parents.forEach((parent, index) => {
      const id = uniqueIds[index]!;
      if (!parent || parent.userId !== userId) {
        throw new InstallmentExpenseNotFoundError(id);
      }
      map.set(id, parent);
    });

    return map;
  }

  private getInstallmentParent(
    parents: Map<string, InstallmentExpense>,
    installment: Installment,
  ): InstallmentExpense {
    const parent = parents.get(installment.installmentExpenseId);
    if (!parent) {
      throw new InstallmentExpenseNotFoundError(installment.installmentExpenseId);
    }
    return parent;
  }

  private getInstallmentCategory(
    categories: Map<string, ExpenseCategory>,
    parents: Map<string, InstallmentExpense>,
    installment: Installment,
  ): ExpenseCategory {
    const parent = this.getInstallmentParent(parents, installment);
    const category = categories.get(parent.categoryId);
    if (!category) {
      throw new ExpenseCategoryNotFoundError(parent.categoryId);
    }
    return category;
  }

  private async loadRecurringVersions(
    expenses: RecurringExpense[],
    year: number,
    month: number,
  ): Promise<RecurringForMonth[]> {
    if (expenses.length === 0) {
      return [];
    }

    const competence = MonthlyCompetence.create(month, year);
    const versions = await Promise.all(
      expenses.map(async (expense) => {
        const version = await this.recurringExpenseRepository.findVersionForMonth(
          expense.id,
          year,
          month,
        );
        if (!version) {
          throw new RecurringExpenseNotFoundError(expense.id);
        }
        const previousAmount = await this.loadPreviousAmount(expense, version, competence);
        return { expense, version, previousAmount };
      }),
    );

    return versions;
  }

  /**
   * Só busca a versão anterior quando a vigente começa exatamente neste mês e o
   * mês é posterior ao início da série (a primeira versão nasce no início, então
   * não há anterior a ela). Assim a consulta extra acontece apenas no mês de
   * reajuste, e nunca recua para antes de 01/2000.
   */
  private async loadPreviousAmount(
    expense: RecurringExpense,
    version: RecurringExpenseVersion,
    competence: MonthlyCompetence,
  ): Promise<number | null> {
    const startsNow = version.getEffectiveCompetence().equals(competence);
    if (!startsNow || !competence.isAfter(expense.getStartCompetence())) {
      return null;
    }
    const previousMonth = MonthlyCompetence.addMonths(competence, -1);
    const previous = await this.recurringExpenseRepository.findVersionForMonth(
      expense.id,
      previousMonth.year,
      previousMonth.month,
    );
    return previous?.amount ?? null;
  }

  private async loadCategories(
    ids: string[],
    userId: string,
  ): Promise<Map<string, ExpenseCategory>> {
    if (ids.length === 0) {
      return new Map();
    }

    const categories = await Promise.all(ids.map((id) => this.categoryRepository.findById(id)));

    const map = new Map<string, ExpenseCategory>();
    categories.forEach((category, index) => {
      const id = ids[index]!;
      if (!category || category.userId !== userId) {
        throw new ExpenseCategoryNotFoundError(id);
      }
      map.set(id, category);
    });

    return map;
  }

  private toOneTimeExpenseDto(
    expense: OneTimeExpense,
    category: ExpenseCategory,
  ): OneTimeExpenseItemDto {
    return {
      id: expense.id,
      type: "ONE_TIME",
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

  private toInstallmentExpenseDto(
    installment: Installment,
    parent: InstallmentExpense,
    category: ExpenseCategory,
  ): InstallmentExpenseItemDto {
    return {
      id: installment.id,
      type: "INSTALLMENT",
      userId: parent.userId,
      categoryId: parent.categoryId,
      category: {
        id: category.id,
        name: category.name,
      },
      description: parent.description,
      amount: installment.amount,
      installmentExpenseId: parent.id,
      installmentNumber: installment.installmentNumber,
      installmentCount: parent.installmentCount,
      totalAmount: parent.totalAmount,
      startYear: parent.startYear,
      startMonth: parent.startMonth,
      endYear: parent.getEndCompetence().year,
      endMonth: parent.getEndCompetence().month,
      createdAt: parent.createdAt.toISOString(),
      updatedAt: parent.updatedAt.toISOString(),
    };
  }

  private toRecurringExpenseDto(
    expense: RecurringExpense,
    version: RecurringExpenseVersion,
    previousAmount: number | null,
    category: ExpenseCategory,
  ): RecurringExpenseItemDto {
    return {
      id: version.id,
      type: "RECURRING",
      userId: expense.userId,
      categoryId: version.categoryId,
      category: {
        id: category.id,
        name: category.name,
      },
      description: version.description,
      amount: version.amount,
      recurringExpenseId: expense.id,
      startYear: expense.startYear,
      startMonth: expense.startMonth,
      endYear: expense.endYear,
      endMonth: expense.endMonth,
      effectiveYear: version.effectiveYear,
      effectiveMonth: version.effectiveMonth,
      versionId: version.id,
      previousAmount,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  private static round(value: number): number {
    return Math.round(value * CENTS_FACTOR) / CENTS_FACTOR;
  }
}
