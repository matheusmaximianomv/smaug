import { describe, it, expect, beforeEach, vi } from "vitest";
import { DataImportService } from "@src/application/services/data-import.service";
import {
  ImportEntriesUseCase,
  ImportEntryInput,
} from "@src/domain/use-cases/data-import/import-entries.use-case";
import {
  ImportEmptyFileError,
  ImportMissingColumnsError,
  ImportNoValidRowsError,
} from "@src/domain/errors/domain-error";

const HEADER =
  "competencia;natureza;categoria;descricao;valor;tipo;parcela;total_parcelas;serie_id;observacao";

function csv(...rows: string[]): string {
  return [HEADER, ...rows].join("\r\n");
}

describe("DataImportService", () => {
  const useCase = { execute: vi.fn() } as unknown as ImportEntriesUseCase;
  const service = new DataImportService(useCase);

  /**
   * As linhas já lidas só saem do service por dentro do use case — `parse` é detalhe interno.
   * Ler o argumento do dublê prova o que de fato atravessa a fronteira.
   */
  async function entriesOf(content: string): Promise<ImportEntryInput[]> {
    await service.import("user-1", content);
    return vi.mocked(useCase.execute).mock.calls[0]![0].entries;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCase.execute).mockResolvedValue({
      oneTimeRevenues: 1,
      fixedRevenues: 2,
      oneTimeExpenses: 3,
      installmentExpenses: 4,
      recurringExpenses: 5,
      categoriesCreated: 6,
    });
  });

  describe("file level failures", () => {
    it("should reject an empty file", async () => {
      await expect(service.preview("")).rejects.toThrow(ImportEmptyFileError);
    });

    it("should reject a file that is missing a required column", async () => {
      await expect(service.preview("competencia;natureza;descricao;tipo")).rejects.toThrow(
        ImportMissingColumnsError,
      );
    });

    it("should name every missing column in the message", async () => {
      await expect(service.preview("competencia;natureza")).rejects.toThrow(
        /descricao, valor, tipo/,
      );
    });

    it("should accept a header whose columns are in a different order", async () => {
      const preview = await service.preview(
        "tipo;valor;descricao;natureza;competencia\r\navulsa;500,00;Bônus;receita;2026-04",
      );
      expect(preview.validRows).toBe(1);
    });

    it("should accept a header with different casing and spacing", async () => {
      const preview = await service.preview(
        " Competencia ;NATUREZA;descricao;valor;tipo\r\n2026-04;receita;Bônus;500,00;avulsa",
      );
      expect(preview.validRows).toBe(1);
    });

    it("should read a header-only file as zero entries", async () => {
      const preview = await service.preview(csv());

      expect(preview.validRows).toBe(0);
      expect(preview.errors).toEqual([]);
    });

    it("should treat a row shorter than the header as having empty trailing fields", async () => {
      const preview = await service.preview(csv("2026-04;receita;;Bônus;500,00;avulsa"));
      expect(preview.errors).toHaveLength(0);

      const entries = await entriesOf(csv("2026-04;receita;;Bônus;500,00;avulsa"));
      expect(entries[0]!.seriesId).toBe("");
    });
  });

  describe("row level failures", () => {
    const firstError = async (row: string) => (await service.preview(csv(row))).errors[0];

    it("should reject a malformed competence", async () => {
      expect(await firstError("abril/26;receita;;Bônus;500,00;avulsa;;;;")).toEqual({
        line: 2,
        code: "INVALID_COMPETENCE",
        value: "abril/26",
      });
    });

    it("should reject a month outside 1-12", async () => {
      expect(await firstError("2026-13;receita;;Bônus;500,00;avulsa;;;;")).toEqual({
        line: 2,
        code: "MONTH_OUT_OF_RANGE",
        value: "13",
      });
    });

    it("should reject a year the domain cannot represent", async () => {
      expect(await firstError("1999-04;receita;;Bônus;500,00;avulsa;;;;")).toEqual({
        line: 2,
        code: "YEAR_OUT_OF_RANGE",
        value: "1999",
      });
    });

    it("should reject an unknown nature", async () => {
      expect((await firstError("2026-04;entrada;;Bônus;500,00;avulsa;;;;"))?.code).toBe(
        "INVALID_NATURE",
      );
    });

    it("should reject an unknown type", async () => {
      expect((await firstError("2026-04;receita;;Bônus;500,00;mensal;;;;"))?.code).toBe(
        "INVALID_TYPE",
      );
    });

    it("should reject an installment revenue", async () => {
      expect((await firstError("2026-04;receita;;Bônus;500,00;parcelada;1;2;s1;"))?.code).toBe(
        "REVENUE_TYPE_NOT_ALLOWED",
      );
    });

    it("should reject a recurring revenue", async () => {
      expect((await firstError("2026-04;receita;;Bônus;500,00;recorrente;;;s1;"))?.code).toBe(
        "REVENUE_TYPE_NOT_ALLOWED",
      );
    });

    it("should reject a fixed expense", async () => {
      expect((await firstError("2026-04;despesa;Moradia;Aluguel;500,00;fixa;;;s1;"))?.code).toBe(
        "EXPENSE_TYPE_NOT_ALLOWED",
      );
    });

    it("should reject an empty description", async () => {
      expect((await firstError("2026-04;receita;;;500,00;avulsa;;;;"))?.code).toBe(
        "EMPTY_DESCRIPTION",
      );
    });

    it("should reject a description longer than the domain allows", async () => {
      const long = "x".repeat(256);
      expect((await firstError(`2026-04;receita;;${long};500,00;avulsa;;;;`))?.code).toBe(
        "DESCRIPTION_TOO_LONG",
      );
    });

    it("should reject a non-numeric amount", async () => {
      expect((await firstError("2026-04;receita;;Bônus;abc;avulsa;;;;"))?.code).toBe(
        "INVALID_AMOUNT",
      );
    });

    it("should reject a zero amount", async () => {
      expect((await firstError("2026-04;receita;;Bônus;0,00;avulsa;;;;"))?.code).toBe(
        "INVALID_AMOUNT",
      );
    });

    it("should reject a negative amount", async () => {
      expect((await firstError("2026-04;receita;;Bônus;-10,00;avulsa;;;;"))?.code).toBe(
        "INVALID_AMOUNT",
      );
    });

    it("should reject an empty amount", async () => {
      expect((await firstError("2026-04;receita;;Bônus;;avulsa;;;;"))?.code).toBe("INVALID_AMOUNT");
    });

    it("should reject an amount with more than two decimal places instead of rounding money", async () => {
      expect((await firstError("2026-04;receita;;Bônus;10,555;avulsa;;;;"))?.code).toBe(
        "INVALID_AMOUNT",
      );
    });

    it("should reject an expense without a category", async () => {
      expect((await firstError("2026-04;despesa;;Mercado;50,00;avulsa;;;;"))?.code).toBe(
        "MISSING_CATEGORY",
      );
    });

    it("should reject an installment number above the total", async () => {
      expect((await firstError("2026-04;despesa;Casa;TV;50,00;parcelada;5;3;s1;"))?.code).toBe(
        "INVALID_INSTALLMENT",
      );
    });

    it("should reject a missing installment number", async () => {
      expect((await firstError("2026-04;despesa;Casa;TV;50,00;parcelada;;12;s1;"))?.code).toBe(
        "INVALID_INSTALLMENT",
      );
    });

    it("should reject an installment total the domain cannot store", async () => {
      expect((await firstError("2026-04;despesa;Casa;TV;50,00;parcelada;1;73;s1;"))?.code).toBe(
        "INVALID_INSTALLMENT",
      );
    });

    it("should report the installment pair as it appeared in the file", async () => {
      expect((await firstError("2026-04;despesa;Casa;TV;50,00;parcelada;5;3;s1;"))?.value).toBe(
        "5/3",
      );
    });

    it("should report the line number as seen in a spreadsheet", async () => {
      const preview = await service.preview(
        csv("2026-04;receita;;Bônus;500,00;avulsa;;;;", "bad;receita;;X;1,00;avulsa;;;;"),
      );
      expect(preview.errors[0]!.line).toBe(3);
    });

    it("should produce at most one error per bad row", async () => {
      const preview = await service.preview(csv("bad;entrada;;;abc;mensal;;;;"));
      expect(preview.errors).toHaveLength(1);
    });

    it("should skip the bad rows and keep the good ones", async () => {
      const preview = await service.preview(
        csv(
          "2026-04;receita;;Bônus;500,00;avulsa;;;;",
          "bad;receita;;X;1,00;avulsa;;;;",
          "2026-05;receita;;Prêmio;300,00;avulsa;;;;",
        ),
      );

      expect(preview.validRows).toBe(2);
      expect(preview.errors).toHaveLength(1);
    });
  });

  describe("row parsing", () => {
    it("should read a pt-BR amount with a thousand separator", async () => {
      const entries = await entriesOf(csv("2026-04;receita;;Salário;9.200,50;avulsa;;;;"));
      expect(entries[0]!.amount).toBe(9200.5);
    });

    it("should read an amount without decimals", async () => {
      const entries = await entriesOf(csv("2026-04;receita;;Salário;9200;avulsa;;;;"));
      expect(entries[0]!.amount).toBe(9200);
    });

    it("should accept a single-digit month", async () => {
      const entries = await entriesOf(csv("2026-4;receita;;Salário;9200,00;avulsa;;;;"));
      expect(entries[0]!.competenceMonth).toBe(4);
    });

    it("should translate the type label into the domain vocabulary", async () => {
      const entries = await entriesOf(
        csv(
          "2026-04;receita;;Salário;9200,00;fixa;;;fix-1;",
          "2026-04;despesa;Casa;TV;50,00;parcelada;1;3;ser-1;",
          "2026-04;despesa;Casa;Luz;90,00;recorrente;;;rec-1;",
          "2026-04;despesa;Casa;Pão;9,00;avulsa;;;;",
        ),
      );

      expect(entries.map((item) => item.type)).toEqual([
        "FIXED",
        "INSTALLMENT",
        "RECURRING",
        "ONE_TIME",
      ]);
    });

    it("should translate the nature label into the domain vocabulary", async () => {
      const entries = await entriesOf(csv("2026-04;RECEITA;;Salário;9200,00;avulsa;;;;"));
      expect(entries[0]!.nature).toBe("REVENUE");
    });

    it("should keep the series id for grouping", async () => {
      const entries = await entriesOf(csv("2026-04;receita;;Salário;9200,00;fixa;;;fix-0001;"));
      expect(entries[0]!.seriesId).toBe("fix-0001");
    });

    it("should trim the description", async () => {
      const entries = await entriesOf(csv("2026-04;receita;;  Salário  ;9200,00;avulsa;;;;"));
      expect(entries[0]!.description).toBe("Salário");
    });

    it("should ignore the observation column, which has no field in the domain", async () => {
      const entries = await entriesOf(
        csv("2026-04;receita;;Salário;9200,00;avulsa;;;;qualquer nota"),
      );
      expect(entries[0]).not.toHaveProperty("observation");
    });

    it("should leave installment fields null for non-installment rows", async () => {
      const entries = await entriesOf(csv("2026-04;receita;;Salário;9200,00;avulsa;;;;"));
      expect(entries[0]!.installmentNumber).toBeNull();
      expect(entries[0]!.installmentCount).toBeNull();
    });
  });

  describe("preview", () => {
    it("should count the valid rows", async () => {
      const preview = await service.preview(
        csv(
          "2026-04;receita;;Bônus;500,00;avulsa;;;;",
          "2026-05;receita;;Prêmio;300,00;avulsa;;;;",
        ),
      );
      expect(preview.validRows).toBe(2);
    });

    it("should return the errors alongside the counts", async () => {
      const preview = await service.preview(csv("bad;receita;;X;1,00;avulsa;;;;"));
      expect(preview.errors).toHaveLength(1);
      expect(preview.validRows).toBe(0);
    });

    it("should break the counts down by type", async () => {
      const preview = await service.preview(
        csv(
          "2026-04;receita;;Salário;9200,00;fixa;;;fix-1;",
          "2026-04;despesa;Casa;TV;50,00;parcelada;1;3;ser-1;",
          "2026-04;despesa;Casa;Luz;90,00;recorrente;;;rec-1;",
          "2026-04;despesa;Casa;Pão;9,00;avulsa;;;;",
        ),
      );

      expect(preview.counts).toEqual({
        oneTime: 1,
        fixed: 1,
        installment: 1,
        recurring: 1,
        series: 3,
      });
    });

    it("should count grouped series once", async () => {
      const preview = await service.preview(
        csv(
          "2026-04;despesa;Casa;TV;50,00;parcelada;1;3;ser-1;",
          "2026-05;despesa;Casa;TV;50,00;parcelada;2;3;ser-1;",
          "2026-06;despesa;Casa;TV;50,00;parcelada;3;3;ser-1;",
        ),
      );

      expect(preview.counts.series).toBe(1);
      expect(preview.counts.installment).toBe(3);
    });

    it("should group a series that has no series id by its description", async () => {
      const preview = await service.preview(
        csv(
          "2026-04;receita;;Salário;9200,00;fixa;;;;",
          "2026-05;receita;;Salário;9200,00;fixa;;;;",
        ),
      );

      expect(preview.counts.series).toBe(1);
      expect(preview.counts.fixed).toBe(2);
    });

    it("should not write anything", async () => {
      await service.preview(csv("2026-04;receita;;Bônus;500,00;avulsa;;;;"));
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });

  describe("import", () => {
    it("should hand the parsed entries to the use case", async () => {
      await service.import("user-1", csv("2026-04;receita;;Bônus;500,00;avulsa;;;;"));

      expect(useCase.execute).toHaveBeenCalledWith({
        userId: "user-1",
        entries: [expect.objectContaining({ description: "Bônus" })],
      });
    });

    it("should total every created record", async () => {
      const result = await service.import(
        "user-1",
        csv("2026-04;receita;;Bônus;500,00;avulsa;;;;"),
      );

      expect(result.total).toBe(15);
      expect(result.created).toEqual({
        oneTimeRevenues: 1,
        fixedRevenues: 2,
        oneTimeExpenses: 3,
        installmentExpenses: 4,
        recurringExpenses: 5,
      });
      expect(result.categoriesCreated).toBe(6);
    });

    it("should refuse a file whose rows are all invalid", async () => {
      await expect(service.import("user-1", csv("bad;receita;;X;1,00;avulsa;;;;"))).rejects.toThrow(
        ImportNoValidRowsError,
      );
    });

    it("should not call the use case when there is nothing to import", async () => {
      await expect(service.import("user-1", csv())).rejects.toThrow(ImportNoValidRowsError);
      expect(useCase.execute).not.toHaveBeenCalled();
    });
  });
});
