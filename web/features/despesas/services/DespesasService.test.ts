import { describe, expect, it } from "vitest";
import { db, mockApiError, seedDb } from "../../../tests/msw";
import {
  makeCategoryWithCount,
  makeInstallmentExpense,
  makeOneTimeExpense,
  makeRecurringExpense,
  makeRecurringExpenseVersion,
} from "../../../tests/fixtures";
import { bodyOf, recordRequests, signatures } from "../../../tests/requests";
import { DespesasService } from "./DespesasService";

const CATEGORY = makeCategoryWithCount({ name: "Moradia" });

const ONE_TIME_PAYLOAD = {
  description: "Supermercado",
  amount: 450,
  categoryId: CATEGORY.id,
  competenceYear: 2026,
  competenceMonth: 9,
};

describe("despesas avulsas", () => {
  it("getOneTime faz GET em /expenses/one-time", async () => {
    seedDb({ oneTimeExpenses: [makeOneTimeExpense()] });
    const calls = recordRequests();

    const expenses = await DespesasService.getOneTime();

    expect(signatures(calls)).toEqual(["GET /expenses/one-time"]);
    expect(expenses).toHaveLength(1);
  });

  it("createOneTime faz POST em /expenses/one-time com o payload", async () => {
    seedDb({ categories: [CATEGORY] });
    const calls = recordRequests();

    const created = await DespesasService.createOneTime(ONE_TIME_PAYLOAD);

    expect(signatures(calls)).toEqual(["POST /expenses/one-time"]);
    expect(await bodyOf(calls[0])).toEqual(ONE_TIME_PAYLOAD);
    expect(created).toMatchObject({ description: "Supermercado", amount: 450 });
    expect(created.category.name).toBe("Moradia");
  });

  it("updateOneTime faz PUT em /expenses/one-time/:id (não PATCH)", async () => {
    const expense = makeOneTimeExpense();
    seedDb({ oneTimeExpenses: [expense] });
    const calls = recordRequests();

    const updated = await DespesasService.updateOneTime(expense.id, {
      ...ONE_TIME_PAYLOAD,
      amount: 500,
    });

    expect(signatures(calls)).toEqual([`PUT /expenses/one-time/${expense.id}`]);
    expect(updated.amount).toBe(500);
  });

  it("deleteOneTime faz DELETE em /expenses/one-time/:id", async () => {
    const expense = makeOneTimeExpense();
    seedDb({ oneTimeExpenses: [expense] });
    const calls = recordRequests();

    await DespesasService.deleteOneTime(expense.id);

    expect(signatures(calls)).toEqual([`DELETE /expenses/one-time/${expense.id}`]);
    expect(db.oneTimeExpenses).toHaveLength(0);
  });

  it("propaga o 404 de despesa inexistente no update", async () => {
    await expect(DespesasService.updateOneTime("exp-999", ONE_TIME_PAYLOAD)).rejects.toMatchObject({
      response: { status: 404, data: { error: "ONE_TIME_EXPENSE_NOT_FOUND" } },
    });
  });
});

describe("despesas parceladas", () => {
  const INSTALLMENT_PAYLOAD = {
    description: "Notebook",
    totalAmount: 3600,
    installmentCount: 12,
    categoryId: CATEGORY.id,
    startYear: 2026,
    startMonth: 9,
  };

  it("getInstallments faz GET em /expenses/installment", async () => {
    seedDb({ installmentExpenses: [makeInstallmentExpense()] });
    const calls = recordRequests();

    const expenses = await DespesasService.getInstallments();

    expect(signatures(calls)).toEqual(["GET /expenses/installment"]);
    expect(expenses[0].installments).toHaveLength(3);
  });

  it("createInstallment faz POST em /expenses/installment com o payload", async () => {
    seedDb({ categories: [CATEGORY] });
    const calls = recordRequests();

    const created = await DespesasService.createInstallment(INSTALLMENT_PAYLOAD);

    expect(signatures(calls)).toEqual(["POST /expenses/installment"]);
    expect(await bodyOf(calls[0])).toEqual(INSTALLMENT_PAYLOAD);
    expect(created.installmentCount).toBe(12);
    expect(created.installments).toHaveLength(12);
  });

  it("deleteInstallment faz DELETE em /expenses/installment/:id", async () => {
    const expense = makeInstallmentExpense();
    seedDb({ installmentExpenses: [expense] });
    const calls = recordRequests();

    await DespesasService.deleteInstallment(expense.id);

    expect(signatures(calls)).toEqual([`DELETE /expenses/installment/${expense.id}`]);
    expect(db.installmentExpenses).toHaveLength(0);
  });

  it("propaga o 409 de parcelamento com competências passadas", async () => {
    const expense = makeInstallmentExpense();
    seedDb({ installmentExpenses: [expense] });
    mockApiError("delete", `/expenses/installment/${expense.id}`, 409, {
      error: "INSTALLMENT_HAS_PAST_COMPETENCE",
    });

    await expect(DespesasService.deleteInstallment(expense.id)).rejects.toMatchObject({
      response: { status: 409, data: { error: "INSTALLMENT_HAS_PAST_COMPETENCE" } },
    });
  });
});

describe("despesas recorrentes", () => {
  const RECURRING_PAYLOAD = {
    description: "Aluguel",
    amount: 2200,
    categoryId: CATEGORY.id,
    startYear: 2026,
    startMonth: 9,
  };

  it("getRecurring faz GET em /expenses/recurring", async () => {
    seedDb({ recurringExpenses: [makeRecurringExpense()] });
    const calls = recordRequests();

    const expenses = await DespesasService.getRecurring();

    expect(signatures(calls)).toEqual(["GET /expenses/recurring"]);
    expect(expenses).toHaveLength(1);
  });

  it("createRecurring faz POST em /expenses/recurring", async () => {
    seedDb({ categories: [CATEGORY] });
    const calls = recordRequests();

    const created = await DespesasService.createRecurring(RECURRING_PAYLOAD);

    expect(signatures(calls)).toEqual(["POST /expenses/recurring"]);
    expect(await bodyOf(calls[0])).toEqual(RECURRING_PAYLOAD);
    expect(created.currentVersion).toMatchObject({ description: "Aluguel", amount: 2200 });
    expect(created.endYear).toBeNull();
  });

  it("createRecurring repassa endYear/endMonth quando informados", async () => {
    seedDb({ categories: [CATEGORY] });

    const created = await DespesasService.createRecurring({
      ...RECURRING_PAYLOAD,
      endYear: 2027,
      endMonth: 3,
    });

    expect(created).toMatchObject({ endYear: 2027, endMonth: 3 });
  });

  it("addRecurringVersion faz PATCH em /expenses/recurring/:id", async () => {
    const expense = makeRecurringExpense();
    seedDb({ categories: [CATEGORY], recurringExpenses: [expense] });
    const calls = recordRequests();

    const updated = await DespesasService.addRecurringVersion(expense.id, {
      description: "Aluguel",
      amount: 2500,
      categoryId: CATEGORY.id,
      effectiveYear: 2026,
      effectiveMonth: 10,
    });

    expect(signatures(calls)).toEqual([`PATCH /expenses/recurring/${expense.id}`]);
    // Diferente da receita fixa, aqui a API devolve a despesa completa.
    expect(updated.currentVersion.amount).toBe(2500);
    expect(updated.versions).toHaveLength(1);
  });

  it("addRecurringVersion propaga o 409 de versão conflitante", async () => {
    const version = makeRecurringExpenseVersion({ effectiveYear: 2026, effectiveMonth: 9 });
    const expense = makeRecurringExpense({ currentVersion: version, versions: [version] });
    seedDb({ recurringExpenses: [expense] });

    await expect(
      DespesasService.addRecurringVersion(expense.id, {
        description: "Aluguel",
        amount: 2500,
        categoryId: version.categoryId,
        effectiveYear: 2026,
        effectiveMonth: 9,
      }),
    ).rejects.toMatchObject({ response: { status: 409, data: { error: "VERSION_CONFLICT" } } });
  });

  it("terminateRecurring faz PATCH em /expenses/recurring/:id/terminate", async () => {
    const expense = makeRecurringExpense();
    seedDb({ recurringExpenses: [expense] });
    const calls = recordRequests();

    const terminated = await DespesasService.terminateRecurring(expense.id, {
      endYear: 2026,
      endMonth: 12,
    });

    expect(signatures(calls)).toEqual([`PATCH /expenses/recurring/${expense.id}/terminate`]);
    expect(await bodyOf(calls[0])).toEqual({ endYear: 2026, endMonth: 12 });
    expect(terminated).toMatchObject({ endYear: 2026, endMonth: 12 });
  });

  it("deleteRecurring faz DELETE em /expenses/recurring/:id", async () => {
    const expense = makeRecurringExpense();
    seedDb({ recurringExpenses: [expense] });
    const calls = recordRequests();

    await DespesasService.deleteRecurring(expense.id);

    expect(signatures(calls)).toEqual([`DELETE /expenses/recurring/${expense.id}`]);
    expect(db.recurringExpenses).toHaveLength(0);
  });

  it("propaga o 404 de despesa recorrente inexistente", async () => {
    await expect(
      DespesasService.terminateRecurring("recor-999", { endYear: 2026, endMonth: 12 }),
    ).rejects.toMatchObject({
      response: { status: 404, data: { error: "RECURRING_EXPENSE_NOT_FOUND" } },
    });
  });
});
