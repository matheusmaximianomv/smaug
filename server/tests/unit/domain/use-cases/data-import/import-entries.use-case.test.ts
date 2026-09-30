import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ImportEntriesUseCase,
  ImportEntryInput,
} from "@src/domain/use-cases/data-import/import-entries.use-case";
import { ExpenseCategoryRepository } from "@src/domain/ports/expense-category.repository";
import { DataImportRepository, ImportPayload } from "@src/domain/ports/data-import.repository";
import { ExpenseCategory } from "@src/domain/entities/expense-category.entity";

const USER_ID = "user-1";

function entry(overrides: Partial<ImportEntryInput> = {}): ImportEntryInput {
  return {
    line: 2,
    competenceMonth: 4,
    competenceYear: 2026,
    nature: "EXPENSE",
    category: "Moradia",
    description: "Aluguel",
    amount: 2200,
    type: "ONE_TIME",
    installmentNumber: null,
    installmentCount: null,
    seriesId: "",
    ...overrides,
  };
}

describe("ImportEntriesUseCase", () => {
  const categoryRepository: ExpenseCategoryRepository = {
    findById: vi.fn(),
    findByNameLower: vi.fn(),
    listByUser: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countLinkedExpenses: vi.fn(),
  };

  const dataImportRepository: DataImportRepository = { persist: vi.fn() };

  const useCase = new ImportEntriesUseCase(categoryRepository, dataImportRepository);

  const persisted = (): ImportPayload => vi.mocked(dataImportRepository.persist).mock.calls[0]![0];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(categoryRepository.listByUser).mockResolvedValue([]);
    vi.mocked(dataImportRepository.persist).mockResolvedValue(undefined);
  });

  it("should persist the whole batch in a single call", async () => {
    await useCase.execute({ userId: USER_ID, entries: [entry()] });
    expect(dataImportRepository.persist).toHaveBeenCalledTimes(1);
  });

  it("should create a one-time revenue from a revenue row", async () => {
    await useCase.execute({
      userId: USER_ID,
      entries: [entry({ nature: "REVENUE", category: "", description: "Bônus", amount: 500 })],
    });

    expect(persisted().oneTimeRevenues).toHaveLength(1);
    expect(persisted().oneTimeRevenues[0]!.description).toBe("Bônus");
    expect(persisted().oneTimeRevenues[0]!.userId).toBe(USER_ID);
  });

  it("should create a one-time expense from an expense row", async () => {
    await useCase.execute({ userId: USER_ID, entries: [entry()] });

    expect(persisted().oneTimeExpenses).toHaveLength(1);
    expect(persisted().oneTimeExpenses[0]!.amount).toBe(2200);
  });

  it("should report the created counts", async () => {
    const report = await useCase.execute({
      userId: USER_ID,
      entries: [entry(), entry({ nature: "REVENUE", category: "" })],
    });

    expect(report).toEqual({
      oneTimeRevenues: 1,
      fixedRevenues: 0,
      oneTimeExpenses: 1,
      installmentExpenses: 0,
      recurringExpenses: 0,
      categoriesCreated: 1,
    });
  });

  describe("categories", () => {
    it("should reuse an existing category matched by lowercase name", async () => {
      const existing = ExpenseCategory.create({ userId: USER_ID, name: "Moradia" });
      vi.mocked(categoryRepository.listByUser).mockResolvedValue([existing]);

      await useCase.execute({ userId: USER_ID, entries: [entry({ category: "MORADIA" })] });

      expect(persisted().categories).toHaveLength(0);
      expect(persisted().oneTimeExpenses[0]!.categoryId).toBe(existing.id);
    });

    it("should create a category that does not exist yet", async () => {
      await useCase.execute({ userId: USER_ID, entries: [entry({ category: "Pets" })] });

      expect(persisted().categories).toHaveLength(1);
      expect(persisted().categories[0]!.name).toBe("Pets");
    });

    it("should create a missing category only once across rows", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [entry({ category: "Pets" }), entry({ category: "pets" })],
      });

      expect(persisted().categories).toHaveLength(1);
      const [first, second] = persisted().oneTimeExpenses;
      expect(first!.categoryId).toBe(second!.categoryId);
    });

    it("should not create categories for revenue rows", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [entry({ nature: "REVENUE", category: "" })],
      });

      expect(persisted().categories).toHaveLength(0);
    });
  });

  describe("no deduplication", () => {
    it("should create one record per identical row", async () => {
      const identical = entry({ description: "Estacionamento", amount: 3.5 });

      await useCase.execute({ userId: USER_ID, entries: [identical, identical, identical] });

      expect(persisted().oneTimeExpenses).toHaveLength(3);
    });

    it("should give each identical row its own id", async () => {
      const identical = entry({ description: "Estacionamento", amount: 3.5 });

      await useCase.execute({ userId: USER_ID, entries: [identical, identical] });

      const ids = persisted().oneTimeExpenses.map((expense) => expense.id);
      expect(new Set(ids).size).toBe(2);
    });
  });

  describe("fixed revenues", () => {
    const fixed = (month: number, amount: number, description = "Salário"): ImportEntryInput =>
      entry({
        nature: "REVENUE",
        category: "",
        type: "FIXED",
        description,
        amount,
        competenceMonth: month,
        seriesId: "fix-0001",
      });

    it("should group rows that share a series id into one revenue", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), fixed(2, 9200), fixed(3, 9200)],
      });

      expect(persisted().fixedRevenues).toHaveLength(1);
    });

    it("should infer the validity from the smallest and largest competence", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(3, 9200), fixed(1, 9200), fixed(2, 9200)],
      });

      const { revenue } = persisted().fixedRevenues[0]!;
      expect(revenue.startMonth).toBe(1);
      expect(revenue.endMonth).toBe(3);
      expect(revenue.startYear).toBe(2026);
    });

    it("should import as ALTERABLE so the revenue stays editable", async () => {
      await useCase.execute({ userId: USER_ID, entries: [fixed(1, 9200)] });

      expect(persisted().fixedRevenues[0]!.revenue.modality).toBe("ALTERABLE");
    });

    it("should keep a single version while nothing changes", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), fixed(2, 9200), fixed(3, 9200)],
      });

      expect(persisted().fixedRevenues[0]!.versions).toHaveLength(1);
    });

    it("should open a new version when the amount changes", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), fixed(2, 9800), fixed(3, 9800)],
      });

      const { versions } = persisted().fixedRevenues[0]!;
      expect(versions).toHaveLength(2);
      expect(versions[1]!.amount).toBe(9800);
      expect(versions[1]!.effectiveMonth).toBe(2);
    });

    it("should open a new version when the description changes", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), fixed(2, 9200, "Salário CLT")],
      });

      expect(persisted().fixedRevenues[0]!.versions).toHaveLength(2);
    });

    it("should group by description when the series id is empty", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [
          { ...fixed(1, 9200), seriesId: "" },
          { ...fixed(2, 9200), seriesId: "" },
        ],
      });

      expect(persisted().fixedRevenues).toHaveLength(1);
    });

    it("should discard the file series id and mint its own", async () => {
      await useCase.execute({ userId: USER_ID, entries: [fixed(1, 9200)] });

      expect(persisted().fixedRevenues[0]!.revenue.id).not.toBe("fix-0001");
    });

    it("should attach every version to the newly created revenue", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), fixed(2, 9800)],
      });

      const { revenue, versions } = persisted().fixedRevenues[0]!;
      expect(versions.every((version) => version.fixedRevenueId === revenue.id)).toBe(true);
    });

    it("should keep two different series apart", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [fixed(1, 9200), { ...fixed(1, 400, "Aluguel recebido"), seriesId: "fix-0002" }],
      });

      expect(persisted().fixedRevenues).toHaveLength(2);
    });
  });

  describe("recurring expenses", () => {
    const recurring = (
      month: number,
      amount: number,
      category = "Moradia",
      year = 2026,
    ): ImportEntryInput =>
      entry({
        type: "RECURRING",
        description: "Aluguel",
        amount,
        category,
        competenceMonth: month,
        competenceYear: year,
        seriesId: "rec-0004",
      });

    it("should group the rows into one recurring expense", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200), recurring(2, 2200)],
      });

      expect(persisted().recurringExpenses).toHaveLength(1);
    });

    it("should infer the validity from the competences present", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200), recurring(2, 2200), recurring(3, 2200)],
      });

      const { expense } = persisted().recurringExpenses[0]!;
      expect(expense.startMonth).toBe(1);
      expect(expense.endMonth).toBe(3);
    });

    it("should accept a past competence, which is the point of importing history", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200, "Moradia", 2020), recurring(2, 2200, "Moradia", 2020)],
      });

      expect(persisted().recurringExpenses[0]!.expense.startYear).toBe(2020);
    });

    it("should open a new version when the category changes", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200), recurring(2, 2200, "Casa")],
      });

      expect(persisted().recurringExpenses[0]!.versions).toHaveLength(2);
    });

    it("should keep one version when only the month advances", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200), recurring(2, 2200), recurring(3, 2200)],
      });

      expect(persisted().recurringExpenses[0]!.versions).toHaveLength(1);
    });

    it("should point each version at the category it names", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [recurring(1, 2200), recurring(2, 2200, "Casa")],
      });

      const { versions } = persisted().recurringExpenses[0]!;
      expect(versions[0]!.categoryId).not.toBe(versions[1]!.categoryId);
      expect(persisted().categories).toHaveLength(2);
    });
  });

  describe("installment expenses", () => {
    const installment = (
      month: number,
      number: number,
      amount = 400,
      count = 12,
    ): ImportEntryInput =>
      entry({
        type: "INSTALLMENT",
        category: "Educação",
        description: "Notebook Pro",
        amount,
        competenceMonth: month,
        installmentNumber: number,
        installmentCount: count,
        seriesId: "ser-0031",
      });

    it("should group the installment rows into one purchase", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 3), installment(5, 4)],
      });

      expect(persisted().installmentExpenses).toHaveLength(1);
    });

    it("should take the installment count from the largest total in the group", async () => {
      await useCase.execute({ userId: USER_ID, entries: [installment(4, 3)] });

      expect(persisted().installmentExpenses[0]!.expense.installmentCount).toBe(12);
    });

    it("should sum only the rows present into the total amount", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 3), installment(5, 4)],
      });

      expect(persisted().installmentExpenses[0]!.expense.totalAmount).toBe(800);
    });

    it("should round the total so a float sum never breaks the two-decimal rule", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 1, 0.1, 3), installment(5, 2, 0.2, 3)],
      });

      expect(persisted().installmentExpenses[0]!.expense.totalAmount).toBe(0.3);
    });

    it("should backdate the start from the first installment present", async () => {
      await useCase.execute({ userId: USER_ID, entries: [installment(4, 3)] });

      const { expense } = persisted().installmentExpenses[0]!;
      expect(expense.startMonth).toBe(2);
      expect(expense.startYear).toBe(2026);
    });

    it("should backdate across the year boundary", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [entry({ ...installment(2, 4), competenceMonth: 2, competenceYear: 2026 })],
      });

      const { expense } = persisted().installmentExpenses[0]!;
      expect(expense.startMonth).toBe(11);
      expect(expense.startYear).toBe(2025);
    });

    it("should backdate from the smallest installment number even if the file rows disagree", async () => {
      // Arquivo inconsistente: a parcela menor aparece numa competência posterior.
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 5), installment(5, 3)],
      });

      const { expense } = persisted().installmentExpenses[0]!;
      expect(expense.startMonth).toBe(3);
      expect(expense.startYear).toBe(2026);
    });

    it("should persist only the installments present in the file", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 3), installment(5, 4)],
      });

      const { installments } = persisted().installmentExpenses[0]!;
      expect(installments).toHaveLength(2);
      expect(installments.map((item) => item.installmentNumber)).toEqual([3, 4]);
    });

    it("should keep each installment amount exactly as the file states", async () => {
      await useCase.execute({
        userId: USER_ID,
        entries: [installment(4, 3, 400), installment(5, 4, 350)],
      });

      const { installments } = persisted().installmentExpenses[0]!;
      expect(installments.map((item) => item.amount)).toEqual([400, 350]);
    });

    it("should attach the installments to the newly created purchase", async () => {
      await useCase.execute({ userId: USER_ID, entries: [installment(4, 3)] });

      const { expense, installments } = persisted().installmentExpenses[0]!;
      expect(installments[0]!.installmentExpenseId).toBe(expense.id);
    });

    it("should never reuse the series id from the file", async () => {
      await useCase.execute({ userId: USER_ID, entries: [installment(4, 3)] });

      expect(persisted().installmentExpenses[0]!.expense.id).not.toBe("ser-0031");
    });
  });
});
