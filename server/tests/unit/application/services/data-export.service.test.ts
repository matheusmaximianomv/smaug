import { describe, it, expect, beforeEach, vi } from "vitest";
import { DataExportService } from "@src/application/services/data-export.service";
import { RevenueQueryService } from "@src/application/services/revenue-query.service";
import { ExpenseQueryService } from "@src/application/services/expense-query.service";
import { OneTimeRevenue } from "@src/domain/entities/one-time-revenue.entity";
import { OneTimeExpense } from "@src/domain/entities/one-time-expense.entity";
import { FixedRevenue } from "@src/domain/entities/fixed-revenue.entity";
import { InstallmentExpense } from "@src/domain/entities/installment-expense.entity";
import { RecurringExpense } from "@src/domain/entities/recurring-expense.entity";
import {
  ExportPeriodInvalidError,
  ExportPeriodTooLongError,
} from "@src/domain/errors/domain-error";
import { ConsolidatedRevenueResponseDto } from "@src/application/dtos/revenue-query.dto";
import {
  ExpenseQueryResponseDto,
  ExpenseQueryItemDto,
} from "@src/application/dtos/expense-query.dto";

const USER_ID = "user-1";
const BOM = "﻿";
const TIMESTAMP = new Date("2026-04-01T00:00:00.000Z");
const ISO = TIMESTAMP.toISOString();

function emptyRevenues(year: number, month: number): ConsolidatedRevenueResponseDto {
  return {
    competenceYear: year,
    competenceMonth: month,
    oneTimeRevenues: [],
    fixedRevenues: [],
    totals: { oneTimeTotal: 0, fixedTotal: 0, total: 0 },
  };
}

function emptyExpenses(year: number, month: number): ExpenseQueryResponseDto {
  return {
    competenceYear: year,
    competenceMonth: month,
    expenses: [],
    totals: { oneTime: 0, installment: 0, recurring: 0, total: 0 },
  };
}

function oneTimeRevenueDto(description: string, amount: number) {
  return {
    id: `rev-${description}`,
    userId: USER_ID,
    description,
    amount,
    competenceMonth: 4,
    competenceYear: 2026,
    createdAt: ISO,
    updatedAt: ISO,
  };
}

function fixedRevenueDto(id: string, description: string, amount: number) {
  return {
    id,
    userId: USER_ID,
    modality: "ALTERABLE" as const,
    startMonth: 1,
    startYear: 2026,
    endMonth: null,
    endYear: null,
    versions: [],
    createdAt: ISO,
    updatedAt: ISO,
    currentVersion: {
      id: `${id}-v1`,
      fixedRevenueId: id,
      description,
      amount,
      effectiveMonth: 1,
      effectiveYear: 2026,
      createdAt: ISO,
    },
  };
}

function expenseItem(overrides: Partial<ExpenseQueryItemDto> = {}): ExpenseQueryItemDto {
  return {
    id: "exp-1",
    type: "ONE_TIME",
    userId: USER_ID,
    categoryId: "cat-1",
    category: { id: "cat-1", name: "Alimentação" },
    description: "Supermercado",
    amount: 320.5,
    competenceYear: 2026,
    competenceMonth: 4,
    createdAt: ISO,
    updatedAt: ISO,
    ...overrides,
  } as ExpenseQueryItemDto;
}

describe("DataExportService", () => {
  const revenueQueryService = {
    getConsolidatedRevenues: vi.fn(),
  } as unknown as RevenueQueryService;
  const expenseQueryService = {
    getConsolidatedExpenses: vi.fn(),
  } as unknown as ExpenseQueryService;

  const oneTimeRevenueRepository = { findAllByUser: vi.fn() };
  const fixedRevenueRepository = { findAllByUser: vi.fn() };
  const oneTimeExpenseRepository = { findAllByUser: vi.fn() };
  const installmentExpenseRepository = { listByUser: vi.fn() };
  const recurringExpenseRepository = { listByUser: vi.fn() };

  const service = new DataExportService(
    revenueQueryService,
    expenseQueryService,
    oneTimeRevenueRepository as never,
    fixedRevenueRepository as never,
    oneTimeExpenseRepository as never,
    installmentExpenseRepository as never,
    recurringExpenseRepository as never,
  );

  const period = {
    mode: "period" as const,
    startYear: 2026,
    startMonth: 4,
    endYear: 2026,
    endMonth: 4,
  };

  function lines(content: string): string[] {
    return content.slice(BOM.length).trimEnd().split("\r\n");
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(revenueQueryService.getConsolidatedRevenues).mockImplementation(
      async (_user, year, month) => emptyRevenues(year, month),
    );
    vi.mocked(expenseQueryService.getConsolidatedExpenses).mockImplementation(
      async (_user, query) => emptyExpenses(query.competenceYear, query.competenceMonth),
    );
    oneTimeRevenueRepository.findAllByUser.mockResolvedValue([]);
    fixedRevenueRepository.findAllByUser.mockResolvedValue([]);
    oneTimeExpenseRepository.findAllByUser.mockResolvedValue([]);
    installmentExpenseRepository.listByUser.mockResolvedValue([]);
    recurringExpenseRepository.listByUser.mockResolvedValue([]);
  });

  describe("period guard", () => {
    it("should reject an inverted period", async () => {
      await expect(
        service.exportCsv(USER_ID, { ...period, startMonth: 6, endMonth: 3 }),
      ).rejects.toThrow(ExportPeriodInvalidError);
    });

    it("should accept a single month", async () => {
      await expect(service.exportCsv(USER_ID, period)).resolves.toBeDefined();
    });

    it("should accept exactly twelve months", async () => {
      await expect(
        service.exportCsv(USER_ID, {
          ...period,
          startMonth: 1,
          endYear: 2026,
          endMonth: 12,
        }),
      ).resolves.toBeDefined();
    });

    it("should reject thirteen months", async () => {
      await expect(
        service.exportCsv(USER_ID, { ...period, startMonth: 1, endYear: 2027, endMonth: 1 }),
      ).rejects.toThrow(ExportPeriodTooLongError);
    });

    it("should query one competence per month in the period", async () => {
      await service.exportCsv(USER_ID, { ...period, startMonth: 1, endMonth: 3 });
      expect(revenueQueryService.getConsolidatedRevenues).toHaveBeenCalledTimes(3);
    });
  });

  describe("file shape", () => {
    it("should emit only the header for an empty period", async () => {
      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)).toHaveLength(1);
    });

    it("should name the file after the export date", async () => {
      const { filename } = await service.exportCsv(
        USER_ID,
        period,
        new Date("2026-09-14T10:00:00Z"),
      );
      expect(filename).toBe("smaug-lancamentos-2026-09-14.csv");
    });

    it("should pad month and day in the filename", async () => {
      const { filename } = await service.exportCsv(
        USER_ID,
        period,
        new Date("2026-01-05T10:00:00Z"),
      );
      expect(filename).toBe("smaug-lancamentos-2026-01-05.csv");
    });
  });

  describe("row mapping", () => {
    it("should map a one-time revenue with empty category and series", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockResolvedValue({
        ...emptyRevenues(2026, 4),
        oneTimeRevenues: [oneTimeRevenueDto("Freelance", 2500)],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toBe("2026-04;receita;;Freelance;2500,00;avulsa;;;;");
    });

    it("should map a fixed revenue using the version in effect and its id as series", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockResolvedValue({
        ...emptyRevenues(2026, 4),
        fixedRevenues: [fixedRevenueDto("fix-1", "Salário", 9200)],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toBe("2026-04;receita;;Salário;9200,00;fixa;;;fix-1;");
    });

    it("should map a one-time expense with its category name", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [expenseItem()],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toBe("2026-04;despesa;Alimentação;Supermercado;320,50;avulsa;;;;");
    });

    it("should map an installment with its number, total and parent id", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({
            type: "INSTALLMENT",
            category: { id: "cat-2", name: "Educação" },
            description: "Notebook Pro",
            amount: 400,
            installmentExpenseId: "ser-0031",
            installmentNumber: 3,
            installmentCount: 12,
          } as never),
        ],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toBe(
        "2026-04;despesa;Educação;Notebook Pro;400,00;parcelada;3;12;ser-0031;",
      );
    });

    it("should map a recurring expense with its parent id as series", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({
            type: "RECURRING",
            category: { id: "cat-3", name: "Moradia" },
            description: "Aluguel",
            amount: 2200,
            recurringExpenseId: "rec-0004",
          } as never),
        ],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toBe(
        "2026-04;despesa;Moradia;Aluguel;2200,00;recorrente;;;rec-0004;",
      );
    });

    it("should leave the observation column empty, since the domain has no such field", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockResolvedValue({
        ...emptyRevenues(2026, 4),
        oneTimeRevenues: [oneTimeRevenueDto("Freelance", 2500)],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]!.endsWith(";")).toBe(true);
    });
  });

  describe("ordering", () => {
    it("should place revenues before expenses in the same competence", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockResolvedValue({
        ...emptyRevenues(2026, 4),
        oneTimeRevenues: [oneTimeRevenueDto("Zebra", 100)],
      });
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [expenseItem({ description: "Abacaxi" })],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(lines(content)[1]).toContain(";receita;");
      expect(lines(content)[2]).toContain(";despesa;");
    });

    it("should sort competences ascending", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockImplementation(
        async (_user, year, month) => ({
          ...emptyRevenues(year, month),
          oneTimeRevenues: [oneTimeRevenueDto(`M${month}`, 100)],
        }),
      );

      const { content } = await service.exportCsv(USER_ID, {
        ...period,
        startMonth: 2,
        endMonth: 4,
      });
      expect(
        lines(content)
          .slice(1)
          .map((line) => line.slice(0, 7)),
      ).toEqual(["2026-02", "2026-03", "2026-04"]);
    });

    it("should sort by category then description using pt-BR collation", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({ id: "e1", category: { id: "c", name: "Educação" }, description: "Zoo" }),
          expenseItem({ id: "e2", category: { id: "a", name: "Água" }, description: "Conta" }),
          expenseItem({
            id: "e3",
            category: { id: "e", name: "Educação" },
            description: "Apostila",
          }),
        ],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(
        lines(content)
          .slice(1)
          .map((line) => line.split(";")[2]),
      ).toEqual(["Água", "Educação", "Educação"]);
      expect(lines(content)[2]!.split(";")[3]).toBe("Apostila");
    });

    it("should order twin rows deterministically by amount", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({ id: "e1", description: "Estacionamento", amount: 7 }),
          expenseItem({ id: "e2", description: "Estacionamento", amount: 3.5 }),
        ],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(
        lines(content)
          .slice(1)
          .map((line) => line.split(";")[4]),
      ).toEqual(["3,50", "7,00"]);
    });

    it("should order installments of the same purchase by number", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({
            id: "i2",
            type: "INSTALLMENT",
            description: "TV",
            amount: 100,
            installmentExpenseId: "s1",
            installmentNumber: 4,
            installmentCount: 6,
          } as never),
          expenseItem({
            id: "i1",
            type: "INSTALLMENT",
            description: "TV",
            amount: 100,
            installmentExpenseId: "s1",
            installmentNumber: 2,
            installmentCount: 6,
          } as never),
        ],
      });

      const { content } = await service.exportCsv(USER_ID, period);
      expect(
        lines(content)
          .slice(1)
          .map((line) => line.split(";")[6]),
      ).toEqual(["2", "4"]);
    });

    it("should produce byte-identical output for two exports of the same period", async () => {
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [
          expenseItem({ id: "e1", description: "Estacionamento", amount: 3.5 }),
          expenseItem({ id: "e2", description: "Estacionamento", amount: 3.5 }),
        ],
      });

      const first = await service.exportCsv(USER_ID, period);
      const second = await service.exportCsv(USER_ID, period);
      expect(first.content).toBe(second.content);
    });
  });

  describe("full mode", () => {
    const fullQuery = { mode: "full" as const };

    it("should export nothing when the base is empty", async () => {
      const { content } = await service.exportCsv(USER_ID, fullQuery);
      expect(lines(content)).toHaveLength(1);
      expect(revenueQueryService.getConsolidatedRevenues).not.toHaveBeenCalled();
    });

    it("should report a null period for an empty base", async () => {
      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodStart).toBeNull();
      expect(summary.periodEnd).toBeNull();
    });

    it("should span from the earliest to the latest one-time entry", async () => {
      oneTimeRevenueRepository.findAllByUser.mockResolvedValue([
        OneTimeRevenue.create({
          userId: USER_ID,
          description: "A",
          amount: 1,
          competenceMonth: 3,
          competenceYear: 2026,
        }),
      ]);
      oneTimeExpenseRepository.findAllByUser.mockResolvedValue([
        OneTimeExpense.create({
          userId: USER_ID,
          categoryId: "c1",
          description: "B",
          amount: 1,
          competenceMonth: 7,
          competenceYear: 2026,
        }),
      ]);

      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodStart).toBe("2026-03");
      expect(summary.periodEnd).toBe("2026-07");
    });

    it("should stretch the end to the last installment of a purchase", async () => {
      installmentExpenseRepository.listByUser.mockResolvedValue([
        InstallmentExpense.create({
          userId: USER_ID,
          categoryId: "c1",
          description: "TV",
          totalAmount: 600,
          installmentCount: 6,
          startMonth: 1,
          startYear: 2026,
        }),
      ]);

      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodStart).toBe("2026-01");
      expect(summary.periodEnd).toBe("2026-06");
    });

    it("should honour the closing competence of a terminated fixed revenue", async () => {
      fixedRevenueRepository.findAllByUser.mockResolvedValue([
        FixedRevenue.create({
          userId: USER_ID,
          modality: "ALTERABLE",
          startMonth: 2,
          startYear: 2026,
          endMonth: 5,
          endYear: 2026,
        }),
      ]);

      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodStart).toBe("2026-02");
      expect(summary.periodEnd).toBe("2026-05");
    });

    it("should materialise an open-ended recurring expense through the current month", async () => {
      recurringExpenseRepository.listByUser.mockResolvedValue([
        RecurringExpense.rehydrate({
          id: "rec-1",
          userId: USER_ID,
          startMonth: 1,
          startYear: 2026,
          endMonth: null,
          endYear: null,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        }),
      ]);

      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodStart).toBe("2026-01");
      expect(summary.periodEnd).toBe(
        `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`,
      );
    });

    it("should not shrink the end when a closed entry already goes further", async () => {
      recurringExpenseRepository.listByUser.mockResolvedValue([
        RecurringExpense.rehydrate({
          id: "rec-1",
          userId: USER_ID,
          startMonth: 1,
          startYear: 2026,
          endMonth: null,
          endYear: null,
          createdAt: TIMESTAMP,
          updatedAt: TIMESTAMP,
        }),
      ]);
      oneTimeExpenseRepository.findAllByUser.mockResolvedValue([
        OneTimeExpense.create({
          userId: USER_ID,
          categoryId: "c1",
          description: "B",
          amount: 1,
          competenceMonth: 12,
          competenceYear: 2099,
        }),
      ]);

      const summary = await service.getSummary(USER_ID, fullQuery);
      expect(summary.periodEnd).toBe("2099-12");
    });

    it("should not truncate a series in full mode", async () => {
      oneTimeRevenueRepository.findAllByUser.mockResolvedValue([
        OneTimeRevenue.create({
          userId: USER_ID,
          description: "A",
          amount: 1,
          competenceMonth: 1,
          competenceYear: 2026,
        }),
        OneTimeRevenue.create({
          userId: USER_ID,
          description: "B",
          amount: 1,
          competenceMonth: 12,
          competenceYear: 2027,
        }),
      ]);

      await service.exportCsv(USER_ID, fullQuery);
      expect(revenueQueryService.getConsolidatedRevenues).toHaveBeenCalledTimes(24);
    });
  });

  describe("summary", () => {
    it("should count revenues and expenses separately", async () => {
      vi.mocked(revenueQueryService.getConsolidatedRevenues).mockResolvedValue({
        ...emptyRevenues(2026, 4),
        oneTimeRevenues: [oneTimeRevenueDto("A", 1), oneTimeRevenueDto("B", 2)],
      });
      vi.mocked(expenseQueryService.getConsolidatedExpenses).mockResolvedValue({
        ...emptyExpenses(2026, 4),
        expenses: [expenseItem()],
      });

      const summary = await service.getSummary(USER_ID, period);
      expect(summary).toEqual({
        total: 3,
        revenues: 2,
        expenses: 1,
        periodStart: "2026-04",
        periodEnd: "2026-04",
      });
    });

    it("should echo the requested period", async () => {
      const summary = await service.getSummary(USER_ID, { ...period, startMonth: 2, endMonth: 5 });
      expect(summary.periodStart).toBe("2026-02");
      expect(summary.periodEnd).toBe("2026-05");
    });
  });
});
