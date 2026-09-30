import { describe, it, expect } from "vitest";
import * as errors from "@src/domain/errors/domain-error";
import { DomainError } from "@src/domain/errors/domain-error";

type ErrorCase = [name: string, instance: DomainError, code: string, message: string];

const cases: ErrorCase[] = [
  [
    "ExpenseCategoryNotFoundError",
    new errors.ExpenseCategoryNotFoundError("cat-1"),
    "EXPENSE_CATEGORY_NOT_FOUND",
    'Expense category with id "cat-1" not found',
  ],
  [
    "ExpenseCategoryNameAlreadyExistsError",
    new errors.ExpenseCategoryNameAlreadyExistsError("Transporte"),
    "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS",
    'Expense category name "Transporte" already exists',
  ],
  [
    "ExpenseCategoryHasLinkedExpensesError",
    new errors.ExpenseCategoryHasLinkedExpensesError(),
    "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES",
    "Expense category has linked expenses and cannot be deleted",
  ],
  [
    "OneTimeExpenseNotFoundError",
    new errors.OneTimeExpenseNotFoundError("exp-1"),
    "ONE_TIME_EXPENSE_NOT_FOUND",
    'One-time expense with id "exp-1" not found',
  ],
  [
    "OneTimeExpensePastCompetenceCreateError",
    new errors.OneTimeExpensePastCompetenceCreateError(),
    "PAST_COMPETENCE",
    "Cannot create expense for a past month",
  ],
  [
    "OneTimeExpensePastCompetenceEditError",
    new errors.OneTimeExpensePastCompetenceEditError(),
    "PAST_COMPETENCE",
    "Cannot edit expense for a past month",
  ],
  [
    "OneTimeExpensePastCompetenceDeleteError",
    new errors.OneTimeExpensePastCompetenceDeleteError(),
    "PAST_COMPETENCE",
    "Cannot delete expense for a past month",
  ],
  [
    "InstallmentExpenseNotFoundError",
    new errors.InstallmentExpenseNotFoundError("inst-1"),
    "INSTALLMENT_EXPENSE_NOT_FOUND",
    'Installment expense with id "inst-1" not found',
  ],
  [
    "InstallmentExpensePastStartError",
    new errors.InstallmentExpensePastStartError(),
    "PAST_COMPETENCE",
    "Cannot create installment expense starting in a past month",
  ],
  [
    "InstallmentFinancialImmutableError",
    new errors.InstallmentFinancialImmutableError(),
    "INSTALLMENT_FINANCIAL_IMMUTABLE",
    "Financial attributes of installment expenses cannot be modified",
  ],
  [
    "InstallmentHasPastCompetenceError",
    new errors.InstallmentHasPastCompetenceError(),
    "INSTALLMENT_HAS_PAST_COMPETENCE",
    "Cannot delete installment expense with installments in past months",
  ],
  [
    "NoFutureInstallmentsError",
    new errors.NoFutureInstallmentsError(),
    "NO_FUTURE_INSTALLMENTS",
    "There are no future installments to remove",
  ],
  [
    "RecurringExpenseNotFoundError",
    new errors.RecurringExpenseNotFoundError("rec-1"),
    "RECURRING_EXPENSE_NOT_FOUND",
    'Recurring expense with id "rec-1" not found',
  ],
  [
    "RecurringExpenseAlreadyExpiredError",
    new errors.RecurringExpenseAlreadyExpiredError(),
    "RECURRING_EXPENSE_ALREADY_EXPIRED",
    "Recurring expense has already expired",
  ],
  [
    "PastCompetenceError",
    new errors.PastCompetenceError(),
    "PAST_COMPETENCE",
    "Competence must be in the current or future month",
  ],
  [
    "PastEffectiveDateError",
    new errors.PastEffectiveDateError(),
    "PAST_EFFECTIVE_DATE",
    "Effective date must be in the current or future month",
  ],
  [
    "EffectiveDateOutOfRangeError",
    new errors.EffectiveDateOutOfRangeError(),
    "EFFECTIVE_DATE_OUT_OF_RANGE",
    "Effective date must be within the recurring expense active period",
  ],
  [
    "EndDateBeforeStartError",
    new errors.EndDateBeforeStartError(),
    "END_DATE_BEFORE_START",
    "End date must be on or after the start date",
  ],
  [
    "ExportPeriodInvalidError",
    new errors.ExportPeriodInvalidError(),
    "EXPORT_PERIOD_INVALID",
    "Export end competence must be on or after the start competence",
  ],
  [
    "ExportPeriodTooLongError",
    new errors.ExportPeriodTooLongError(),
    "EXPORT_PERIOD_TOO_LONG",
    "Export period must not exceed 12 months",
  ],
  [
    "ImportEmptyFileError",
    new errors.ImportEmptyFileError(),
    "IMPORT_EMPTY_FILE",
    "Import file is empty",
  ],
  [
    "ImportMissingColumnsError",
    new errors.ImportMissingColumnsError(["competencia", "valor"]),
    "IMPORT_MISSING_COLUMNS",
    "Import file is missing required columns: competencia, valor",
  ],
  [
    "ImportNoValidRowsError",
    new errors.ImportNoValidRowsError(),
    "IMPORT_NO_VALID_ROWS",
    "Import file has no valid entries",
  ],
];

describe("domain errors", () => {
  it.each(cases)("%s should carry its code, name and message", (name, instance, code, message) => {
    expect(instance).toBeInstanceOf(DomainError);
    expect(instance).toBeInstanceOf(Error);
    expect(instance.name).toBe(name);
    expect(instance.code).toBe(code);
    expect(instance.message).toBe(message);
  });

  it("should cover every exported error class", () => {
    const exported = Object.keys(errors).filter((key) => key !== "DomainError");
    expect(new Set(cases.map(([name]) => name))).toEqual(new Set(exported));
  });
});
