import { randomUUID } from "crypto";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { FixedRevenueVersion } from "@src/domain/entities/fixed-revenue-version.entity";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { Installment } from "@src/domain/entities/installment.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import { RecurringExpenseVersion } from "@src/domain/entities/recurring-expense-version.entity";
import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { DataImportRepository, ImportPayload } from "@src/domain/ports/data-import.repository";

const CENTS_FACTOR = 100;

export type ImportEntryNature = "REVENUE" | "EXPENSE";
export type ImportEntryType = "ONE_TIME" | "FIXED" | "INSTALLMENT" | "RECURRING";

export interface ImportEntryInput {
  line: number;
  competenceMonth: number;
  competenceYear: number;
  nature: ImportEntryNature;
  category: string;
  description: string;
  amount: number;
  type: ImportEntryType;
  installmentNumber: number | null;
  installmentCount: number | null;
  seriesId: string;
}

export interface ImportEntriesInput {
  userId: string;
  entries: ImportEntryInput[];
}

export interface ImportReport {
  oneTimeRevenues: number;
  fixedRevenues: number;
  oneTimeExpenses: number;
  installmentExpenses: number;
  recurringExpenses: number;
  categoriesCreated: number;
}

export class ImportEntriesUseCase {
  public constructor(
    private readonly categoryRepository: ExpenseCategoryRepository,
    private readonly dataImportRepository: DataImportRepository,
  ) {}

  public async execute(input: ImportEntriesInput): Promise<ImportReport> {
    const { userId, entries } = input;

    const existingCategories = await this.categoryRepository.listByUser(userId);
    const categoriesByName = new Map<string, ExpenseCategory>(
      existingCategories.map((category) => [category.nameLower, category]),
    );

    const payload: ImportPayload = {
      categories: [],
      oneTimeRevenues: [],
      fixedRevenues: [],
      oneTimeExpenses: [],
      installmentExpenses: [],
      recurringExpenses: [],
    };

    const ensureCategory = (name: string): string => {
      const key = name.trim().toLowerCase();
      const existing = categoriesByName.get(key);
      if (existing) {
        return existing.id;
      }

      const created = ExpenseCategory.create({ userId, name });
      categoriesByName.set(key, created);
      payload.categories.push(created);
      return created.id;
    };

    // Avulsas viram um registro por linha; séries são agrupadas e materializadas depois.
    const groups = new Map<string, ImportEntryInput[]>();

    entries.forEach((entry) => {
      if (entry.type === "ONE_TIME") {
        if (entry.nature === "REVENUE") {
          payload.oneTimeRevenues.push(
            OneTimeRevenue.create({
              userId,
              description: entry.description,
              amount: entry.amount,
              competenceMonth: entry.competenceMonth,
              competenceYear: entry.competenceYear,
            }),
          );
          return;
        }

        payload.oneTimeExpenses.push(
          OneTimeExpense.create({
            userId,
            categoryId: ensureCategory(entry.category),
            description: entry.description,
            amount: entry.amount,
            competenceMonth: entry.competenceMonth,
            competenceYear: entry.competenceYear,
          }),
        );
        return;
      }

      // O serie_id do arquivo só agrupa as linhas entre si; quando falta, a descrição faz o papel.
      const key = `${entry.type}|${entry.seriesId || entry.description}`;
      const group = groups.get(key);
      if (group) {
        group.push(entry);
        return;
      }
      groups.set(key, [entry]);
    });

    groups.forEach((group) => {
      const sorted = ImportEntriesUseCase.sortByCompetence(group);

      if (sorted[0]!.type === "INSTALLMENT") {
        ImportEntriesUseCase.appendInstallmentExpense(userId, sorted, ensureCategory, payload);
        return;
      }
      if (sorted[0]!.type === "FIXED") {
        ImportEntriesUseCase.appendFixedRevenue(userId, sorted, payload);
        return;
      }
      ImportEntriesUseCase.appendRecurringExpense(userId, sorted, ensureCategory, payload);
    });

    await this.dataImportRepository.persist(payload);

    return {
      oneTimeRevenues: payload.oneTimeRevenues.length,
      fixedRevenues: payload.fixedRevenues.length,
      oneTimeExpenses: payload.oneTimeExpenses.length,
      installmentExpenses: payload.installmentExpenses.length,
      recurringExpenses: payload.recurringExpenses.length,
      categoriesCreated: payload.categories.length,
    };
  }

  private static sortByCompetence(entries: ImportEntryInput[]): ImportEntryInput[] {
    return [...entries].sort(
      (a, b) => a.competenceYear - b.competenceYear || a.competenceMonth - b.competenceMonth,
    );
  }

  /**
   * A série pode chegar truncada — exportar só abril traz a parcela 3/12 sozinha. Nesse caso
   * `installmentCount` guarda o tamanho real da compra e `totalAmount` soma apenas o que veio no
   * arquivo; só as parcelas presentes são gravadas. `calculateInstallments()` não serve aqui:
   * ele regeraria as doze parcelas com rateio próprio, inventando o que o arquivo não trouxe.
   */
  private static appendInstallmentExpense(
    userId: string,
    entries: ImportEntryInput[],
    ensureCategory: (name: string) => string,
    payload: ImportPayload,
  ): void {
    const first = entries.reduce((earliest, entry) =>
      entry.installmentNumber! < earliest.installmentNumber! ? entry : earliest,
    );
    const installmentCount = Math.max(...entries.map((entry) => entry.installmentCount!));
    const totalAmount = ImportEntriesUseCase.round(
      entries.reduce((sum, entry) => sum + entry.amount, 0),
    );

    const start = MonthlyCompetence.addMonths(
      MonthlyCompetence.create(first.competenceMonth, first.competenceYear),
      -(first.installmentNumber! - 1),
    );

    const expense = InstallmentExpense.create({
      userId,
      categoryId: ensureCategory(first.category),
      description: first.description,
      totalAmount,
      installmentCount,
      startMonth: start.month,
      startYear: start.year,
    });

    const installments = entries.map((entry) =>
      Installment.create({
        installmentExpenseId: expense.id,
        installmentNumber: entry.installmentNumber!,
        amount: entry.amount,
        competenceMonth: entry.competenceMonth,
        competenceYear: entry.competenceYear,
      }),
    );

    payload.installmentExpenses.push({ expense, installments });
  }

  private static appendFixedRevenue(
    userId: string,
    entries: ImportEntryInput[],
    payload: ImportPayload,
  ): void {
    const first = entries[0]!;
    const last = entries[entries.length - 1]!;

    const revenue = FixedRevenue.create({
      userId,
      modality: "ALTERABLE",
      startMonth: first.competenceMonth,
      startYear: first.competenceYear,
      endMonth: last.competenceMonth,
      endYear: last.competenceYear,
    });

    const versions = ImportEntriesUseCase.changePoints(
      entries,
      (entry) => `${entry.description}|${entry.amount}`,
    ).map((entry) =>
      FixedRevenueVersion.create({
        fixedRevenueId: revenue.id,
        description: entry.description,
        amount: entry.amount,
        effectiveMonth: entry.competenceMonth,
        effectiveYear: entry.competenceYear,
      }),
    );

    payload.fixedRevenues.push({ revenue, versions });
  }

  /**
   * Único ponto onde a trava de competência passada precisa ser contornada: `create()` de
   * recorrente e de sua versão rejeitam meses passados, e a importação existe justamente para
   * trazer histórico. As demais validações já foram aplicadas na leitura do arquivo.
   */
  private static appendRecurringExpense(
    userId: string,
    entries: ImportEntryInput[],
    ensureCategory: (name: string) => string,
    payload: ImportPayload,
  ): void {
    const first = entries[0]!;
    const last = entries[entries.length - 1]!;
    const now = new Date();

    const expense = RecurringExpense.rehydrate({
      id: randomUUID(),
      userId,
      startMonth: first.competenceMonth,
      startYear: first.competenceYear,
      endMonth: last.competenceMonth,
      endYear: last.competenceYear,
      createdAt: now,
      updatedAt: now,
    });

    const versions = ImportEntriesUseCase.changePoints(
      entries,
      (entry) => `${entry.description}|${entry.amount}|${entry.category.trim().toLowerCase()}`,
    ).map((entry) =>
      RecurringExpenseVersion.rehydrate({
        id: randomUUID(),
        recurringExpenseId: expense.id,
        categoryId: ensureCategory(entry.category),
        description: entry.description,
        amount: entry.amount,
        effectiveMonth: entry.competenceMonth,
        effectiveYear: entry.competenceYear,
        createdAt: now,
      }),
    );

    payload.recurringExpenses.push({ expense, versions });
  }

  /** Primeira linha de cada troca de conteúdo — é onde nasce uma versão nova. */
  private static changePoints(
    entries: ImportEntryInput[],
    signature: (entry: ImportEntryInput) => string,
  ): ImportEntryInput[] {
    let previous: string | null = null;

    return entries.filter((entry) => {
      const current = signature(entry);
      if (current === previous) {
        return false;
      }
      previous = current;
      return true;
    });
  }

  private static round(value: number): number {
    return Math.round(value * CENTS_FACTOR) / CENTS_FACTOR;
  }
}
