import { MonthlyCompetence } from "@src/domain/value-objects/monthly-competence.value-object";
import { OneTimeRevenueRepository } from "@src/domain/ports/one-time-revenue.repository";
import { FixedRevenueRepository } from "@src/domain/ports/fixed-revenue.repository";
import { OneTimeExpenseRepository } from "@src/domain/ports/one-time-expense.repository";
import { InstallmentExpenseRepository } from "@src/domain/ports/installment-expense.repository";
import { RecurringExpenseRepository } from "@src/domain/ports/recurring-expense.repository";
import { RevenueQueryService } from "@src/application/services/revenue-query.service";
import { ExpenseQueryService } from "@src/application/services/expense-query.service";
import {
  CsvEntryRow,
  DataExportQueryDto,
  DataExportSummaryResponseDto,
  EXPORT_MAX_MONTHS,
} from "@src/application/dtos/data-export.dto";
import { serializeCsv } from "@src/application/csv/csv-serializer";
import {
  ExportPeriodInvalidError,
  ExportPeriodTooLongError,
} from "@src/domain/errors/domain-error";

const FILENAME_PREFIX = "smaug-lancamentos";
const DATE_PAD_LENGTH = 2;
const COLLATOR_LOCALE = "pt-BR";

interface CompetenceBounds {
  start: MonthlyCompetence;
  end: MonthlyCompetence;
}

export class DataExportService {
  public constructor(
    private readonly revenueQueryService: RevenueQueryService,
    private readonly expenseQueryService: ExpenseQueryService,
    private readonly oneTimeRevenueRepository: OneTimeRevenueRepository,
    private readonly fixedRevenueRepository: FixedRevenueRepository,
    private readonly oneTimeExpenseRepository: OneTimeExpenseRepository,
    private readonly installmentExpenseRepository: InstallmentExpenseRepository,
    private readonly recurringExpenseRepository: RecurringExpenseRepository,
  ) {}

  public async getSummary(
    userId: string,
    query: DataExportQueryDto,
  ): Promise<DataExportSummaryResponseDto> {
    const bounds = await this.resolveBounds(userId, query);
    const rows = await this.buildRows(userId, bounds);

    return {
      total: rows.length,
      revenues: rows.filter((row) => row.nature === "receita").length,
      expenses: rows.filter((row) => row.nature === "despesa").length,
      periodStart: bounds === null ? null : bounds.start.toString(),
      periodEnd: bounds === null ? null : bounds.end.toString(),
    };
  }

  public async exportCsv(
    userId: string,
    query: DataExportQueryDto,
    referenceDate: Date = new Date(),
  ): Promise<{ filename: string; content: string }> {
    const bounds = await this.resolveBounds(userId, query);
    const rows = await this.buildRows(userId, bounds);

    return {
      filename: DataExportService.buildFilename(referenceDate),
      content: serializeCsv(rows),
    };
  }

  private async buildRows(userId: string, bounds: CompetenceBounds | null): Promise<CsvEntryRow[]> {
    if (bounds === null) {
      return [];
    }

    const rows: CsvEntryRow[] = [];

    // Um round-trip de consulta por mês. Reusa RevenueQueryService/ExpenseQueryService, que já
    // resolvem a versão vigente e a categoria do mês — montar isso de novo aqui duplicaria regra.
    for (const competence of MonthlyCompetence.range(bounds.start, bounds.end)) {
      const label = competence.toString();

      const [revenues, expenses] = await Promise.all([
        this.revenueQueryService.getConsolidatedRevenues(userId, competence.year, competence.month),
        this.expenseQueryService.getConsolidatedExpenses(userId, {
          competenceYear: competence.year,
          competenceMonth: competence.month,
        }),
      ]);

      revenues.oneTimeRevenues.forEach((revenue) => {
        rows.push(
          DataExportService.baseRow(
            label,
            "receita",
            "avulsa",
            revenue.description,
            revenue.amount,
          ),
        );
      });

      revenues.fixedRevenues.forEach((revenue) => {
        rows.push({
          ...DataExportService.baseRow(
            label,
            "receita",
            "fixa",
            revenue.currentVersion.description,
            revenue.currentVersion.amount,
          ),
          seriesId: revenue.id,
        });
      });

      expenses.expenses.forEach((expense) => {
        const base = {
          ...DataExportService.baseRow(
            label,
            "despesa",
            "avulsa",
            expense.description,
            expense.amount,
          ),
          category: expense.category.name,
        };

        if (expense.type === "INSTALLMENT") {
          rows.push({
            ...base,
            type: "parcelada",
            installmentNumber: expense.installmentNumber,
            installmentCount: expense.installmentCount,
            seriesId: expense.installmentExpenseId,
          });
          return;
        }

        if (expense.type === "RECURRING") {
          rows.push({ ...base, type: "recorrente", seriesId: expense.recurringExpenseId });
          return;
        }

        rows.push(base);
      });
    }

    return DataExportService.sortRows(rows);
  }

  /**
   * Ordenação da especificação: competência, natureza (receita antes), categoria, descrição.
   * Os três últimos critérios são desempate adicional: sem eles, lançamentos gêmeos — três
   * "Estacionamento 3,50" no mesmo mês — ficariam na ordem em que o banco devolvesse, e a
   * promessa de dois exports idênticos byte a byte cairia.
   */
  private static sortRows(rows: CsvEntryRow[]): CsvEntryRow[] {
    const collator = new Intl.Collator(COLLATOR_LOCALE);

    return [...rows].sort(
      (a, b) =>
        a.competence.localeCompare(b.competence) ||
        DataExportService.natureRank(a) - DataExportService.natureRank(b) ||
        collator.compare(a.category, b.category) ||
        collator.compare(a.description, b.description) ||
        a.amount - b.amount ||
        collator.compare(a.seriesId, b.seriesId) ||
        (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0),
    );
  }

  private static natureRank(row: CsvEntryRow): number {
    return row.nature === "receita" ? 0 : 1;
  }

  private static baseRow(
    competence: string,
    nature: CsvEntryRow["nature"],
    type: CsvEntryRow["type"],
    description: string,
    amount: number,
  ): CsvEntryRow {
    return {
      competence,
      nature,
      category: "",
      description,
      amount,
      type,
      installmentNumber: null,
      installmentCount: null,
      seriesId: "",
      // O domínio não tem campo de observação; a coluna existe no formato e sai sempre vazia.
      observation: "",
    };
  }

  private async resolveBounds(
    userId: string,
    query: DataExportQueryDto,
  ): Promise<CompetenceBounds | null> {
    if (query.mode === "full") {
      return this.resolveFullBounds(userId);
    }

    const start = MonthlyCompetence.create(query.startMonth!, query.startYear!);
    const end = MonthlyCompetence.create(query.endMonth!, query.endYear!);

    if (end.isBefore(start)) {
      throw new ExportPeriodInvalidError();
    }
    if (MonthlyCompetence.range(start, end).length > EXPORT_MAX_MONTHS) {
      throw new ExportPeriodTooLongError();
    }

    return { start, end };
  }

  /**
   * Limites reais da base. Fixas e recorrentes em aberto são materializadas até o mês vigente —
   * é o que a tela promete ao oferecer "base completa".
   */
  private async resolveFullBounds(
    userId: string,
    referenceDate: Date = new Date(),
  ): Promise<CompetenceBounds | null> {
    const [
      oneTimeRevenues,
      fixedRevenues,
      oneTimeExpenses,
      installmentExpenses,
      recurringExpenses,
    ] = await Promise.all([
      this.oneTimeRevenueRepository.findAllByUser(userId),
      this.fixedRevenueRepository.findAllByUser(userId),
      this.oneTimeExpenseRepository.findAllByUser(userId),
      this.installmentExpenseRepository.listByUser(userId),
      this.recurringExpenseRepository.listByUser(userId),
    ]);

    const points: MonthlyCompetence[] = [];
    let hasOpenEnded = false;

    oneTimeRevenues.forEach((revenue) => points.push(revenue.getCompetence()));
    oneTimeExpenses.forEach((expense) => points.push(expense.getCompetence()));

    installmentExpenses.forEach((expense) => {
      const start = expense.getStartCompetence();
      points.push(start, MonthlyCompetence.addMonths(start, expense.installmentCount - 1));
    });

    [...fixedRevenues, ...recurringExpenses].forEach((entry) => {
      points.push(entry.getStartCompetence());
      const end = entry.getEndCompetence();
      if (end === null) {
        hasOpenEnded = true;
        return;
      }
      points.push(end);
    });

    if (points.length === 0) {
      return null;
    }

    let start = points[0]!;
    let end = points[0]!;
    points.forEach((point) => {
      if (point.isBefore(start)) start = point;
      if (point.isAfter(end)) end = point;
    });

    if (hasOpenEnded) {
      const current = MonthlyCompetence.create(
        referenceDate.getUTCMonth() + 1,
        referenceDate.getUTCFullYear(),
      );
      if (current.isAfter(end)) {
        end = current;
      }
    }

    return { start, end };
  }

  private static buildFilename(referenceDate: Date): string {
    const year = referenceDate.getUTCFullYear();
    const month = String(referenceDate.getUTCMonth() + 1).padStart(DATE_PAD_LENGTH, "0");
    const day = String(referenceDate.getUTCDate()).padStart(DATE_PAD_LENGTH, "0");
    return `${FILENAME_PREFIX}-${year}-${month}-${day}.csv`;
  }
}
