import { parseCsvGrid } from "@src/application/csv/csv-parser";
import {
  ImportCountsDto,
  ImportErrorDto,
  ImportPreviewResponseDto,
  ImportResultResponseDto,
  ImportRowErrorCode,
} from "@src/application/dtos/data-import.dto";
import {
  ImportEntriesUseCase,
  ImportEntryInput,
  ImportEntryType,
} from "@src/domain/use-cases/data-import/import-entries.use-case";
import {
  ImportEmptyFileError,
  ImportMissingColumnsError,
  ImportNoValidRowsError,
} from "@src/domain/errors/domain-error";

const REQUIRED_COLUMNS = ["competencia", "natureza", "descricao", "valor", "tipo"];
const MIN_YEAR = 2000;
const MAX_DESCRIPTION_LENGTH = 255;
const MAX_INSTALLMENT_COUNT = 72;
const MAX_DECIMAL_PLACES = 2;
const COMPETENCE_PATTERN = /^(\d{4})-(\d{1,2})$/;

const TYPE_BY_LABEL: Record<string, ImportEntryType> = {
  avulsa: "ONE_TIME",
  fixa: "FIXED",
  parcelada: "INSTALLMENT",
  recorrente: "RECURRING",
};

interface ParseResult {
  entries: ImportEntryInput[];
  errors: ImportErrorDto[];
}

export class DataImportService {
  public constructor(private readonly importEntriesUseCase: ImportEntriesUseCase) {}

  public preview(content: string): ImportPreviewResponseDto {
    const { entries, errors } = this.parse(content);

    return {
      validRows: entries.length,
      errors,
      counts: DataImportService.countEntries(entries),
    };
  }

  public async import(userId: string, content: string): Promise<ImportResultResponseDto> {
    const { entries } = this.parse(content);

    if (entries.length === 0) {
      throw new ImportNoValidRowsError();
    }

    const report = await this.importEntriesUseCase.execute({ userId, entries });

    return {
      total:
        report.oneTimeRevenues +
        report.fixedRevenues +
        report.oneTimeExpenses +
        report.installmentExpenses +
        report.recurringExpenses,
      created: {
        oneTimeRevenues: report.oneTimeRevenues,
        fixedRevenues: report.fixedRevenues,
        oneTimeExpenses: report.oneTimeExpenses,
        installmentExpenses: report.installmentExpenses,
        recurringExpenses: report.recurringExpenses,
      },
      categoriesCreated: report.categoriesCreated,
    };
  }

  /**
   * Uma linha inválida gera no máximo um erro e é descartada; as demais seguem. O arquivo só é
   * rejeitado por inteiro quando está vazio ou quando o cabeçalho não tem as colunas obrigatórias.
   */
  public parse(content: string): ParseResult {
    const grid = parseCsvGrid(content);

    if (grid.length === 0) {
      throw new ImportEmptyFileError();
    }

    const header = grid[0]!.map((column) => column.trim().toLowerCase());
    const missing = REQUIRED_COLUMNS.filter((column) => !header.includes(column));

    if (missing.length > 0) {
      throw new ImportMissingColumnsError(missing);
    }

    const entries: ImportEntryInput[] = [];
    const errors: ImportErrorDto[] = [];

    for (let index = 1; index < grid.length; index += 1) {
      const row = grid[index]!;
      const line = index + 1;
      const read = (column: string): string => {
        const position = header.indexOf(column);
        return position === -1 ? "" : (row[position] ?? "").trim();
      };

      const parsed = DataImportService.parseRow(line, read);

      if ("code" in parsed) {
        errors.push(parsed);
        continue;
      }
      entries.push(parsed);
    }

    return { entries, errors };
  }

  private static parseRow(
    line: number,
    read: (column: string) => string,
  ): ImportEntryInput | ImportErrorDto {
    const fail = (code: ImportRowErrorCode, value?: string): ImportErrorDto =>
      value === undefined ? { line, code } : { line, code, value };

    const rawCompetence = read("competencia");
    const competenceMatch = COMPETENCE_PATTERN.exec(rawCompetence);
    if (!competenceMatch) {
      return fail("INVALID_COMPETENCE", rawCompetence);
    }

    const competenceYear = Number(competenceMatch[1]);
    const competenceMonth = Number(competenceMatch[2]);
    if (competenceMonth < 1 || competenceMonth > 12) {
      return fail("MONTH_OUT_OF_RANGE", String(competenceMonth));
    }
    // MonthlyCompetence exige ano >= 2000; sem esta guarda a linha viraria erro 500 em vez de
    // uma linha rejeitada com o resto do arquivo seguindo.
    if (competenceYear < MIN_YEAR) {
      return fail("YEAR_OUT_OF_RANGE", String(competenceYear));
    }

    const rawNature = read("natureza");
    const nature = rawNature.toLowerCase();
    if (nature !== "receita" && nature !== "despesa") {
      return fail("INVALID_NATURE", rawNature);
    }

    const rawType = read("tipo");
    const type = TYPE_BY_LABEL[rawType.toLowerCase()];
    if (!type) {
      return fail("INVALID_TYPE", rawType);
    }
    if (nature === "receita" && (type === "INSTALLMENT" || type === "RECURRING")) {
      return fail("REVENUE_TYPE_NOT_ALLOWED", rawType.toLowerCase());
    }
    if (nature === "despesa" && type === "FIXED") {
      return fail("EXPENSE_TYPE_NOT_ALLOWED", rawType.toLowerCase());
    }

    const description = read("descricao");
    if (description.length === 0) {
      return fail("EMPTY_DESCRIPTION");
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return fail("DESCRIPTION_TOO_LONG", String(description.length));
    }

    const rawAmount = read("valor");
    const amount = DataImportService.parseAmount(rawAmount);
    if (amount === null) {
      return fail("INVALID_AMOUNT", rawAmount);
    }

    const category = read("categoria");
    if (nature === "despesa" && category.length === 0) {
      return fail("MISSING_CATEGORY");
    }

    let installmentNumber: number | null = null;
    let installmentCount: number | null = null;

    if (type === "INSTALLMENT") {
      const rawNumber = read("parcela");
      const rawCount = read("total_parcelas");
      installmentNumber = Number.parseInt(rawNumber, 10);
      installmentCount = Number.parseInt(rawCount, 10);

      const invalid =
        Number.isNaN(installmentNumber) ||
        Number.isNaN(installmentCount) ||
        installmentNumber < 1 ||
        installmentCount < 1 ||
        installmentNumber > installmentCount ||
        installmentCount > MAX_INSTALLMENT_COUNT;

      if (invalid) {
        return fail("INVALID_INSTALLMENT", `${rawNumber}/${rawCount}`);
      }
    }

    return {
      line,
      competenceMonth,
      competenceYear,
      nature: nature === "receita" ? "REVENUE" : "EXPENSE",
      category,
      description,
      amount,
      type,
      installmentNumber,
      installmentCount,
      seriesId: read("serie_id"),
    };
  }

  /**
   * Formato pt-BR: ponto é separador de milhar, vírgula é decimal. Valores com mais de duas casas
   * são recusados em vez de arredondados — é dinheiro, e arredondar em silêncio numa migração
   * esconderia a divergência do arquivo de origem.
   */
  private static parseAmount(raw: string): number | null {
    if (raw.length === 0) {
      return null;
    }

    const normalized = raw.replace(/\./g, "").replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(normalized)) {
      return null;
    }

    const decimals = normalized.split(".")[1];
    if (decimals !== undefined && decimals.length > MAX_DECIMAL_PLACES) {
      return null;
    }

    const amount = Number(normalized);
    return amount > 0 ? amount : null;
  }

  private static countEntries(entries: ImportEntryInput[]): ImportCountsDto {
    const series = new Set(
      entries
        .filter((entry) => entry.type !== "ONE_TIME")
        .map((entry) => `${entry.type}|${entry.seriesId || entry.description}`),
    );

    return {
      oneTime: entries.filter((entry) => entry.type === "ONE_TIME").length,
      fixed: entries.filter((entry) => entry.type === "FIXED").length,
      installment: entries.filter((entry) => entry.type === "INSTALLMENT").length,
      recurring: entries.filter((entry) => entry.type === "RECURRING").length,
      series: series.size,
    };
  }
}
