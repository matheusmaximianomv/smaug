export abstract class DomainError extends Error {
  public abstract readonly code: string;
}

export class ExpenseCategoryNotFoundError extends DomainError {
  public readonly code = "EXPENSE_CATEGORY_NOT_FOUND";

  public constructor(categoryId: string) {
    super(`Expense category with id "${categoryId}" not found`);
    this.name = "ExpenseCategoryNotFoundError";
  }
}

export class ExpenseCategoryNameAlreadyExistsError extends DomainError {
  public readonly code = "EXPENSE_CATEGORY_NAME_ALREADY_EXISTS";

  public constructor(categoryName: string) {
    super(`Expense category name "${categoryName}" already exists`);
    this.name = "ExpenseCategoryNameAlreadyExistsError";
  }
}

export class ExpenseCategoryHasLinkedExpensesError extends DomainError {
  public readonly code = "EXPENSE_CATEGORY_HAS_LINKED_EXPENSES";

  public constructor() {
    super("Expense category has linked expenses and cannot be deleted");
    this.name = "ExpenseCategoryHasLinkedExpensesError";
  }
}

export class OneTimeExpenseNotFoundError extends DomainError {
  public readonly code = "ONE_TIME_EXPENSE_NOT_FOUND";

  public constructor(expenseId: string) {
    super(`One-time expense with id "${expenseId}" not found`);
    this.name = "OneTimeExpenseNotFoundError";
  }
}

export class OneTimeExpensePastCompetenceCreateError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  public constructor() {
    super("Cannot create expense for a past month");
    this.name = "OneTimeExpensePastCompetenceCreateError";
  }
}

export class OneTimeExpensePastCompetenceEditError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  public constructor() {
    super("Cannot edit expense for a past month");
    this.name = "OneTimeExpensePastCompetenceEditError";
  }
}

export class OneTimeExpensePastCompetenceDeleteError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  public constructor() {
    super("Cannot delete expense for a past month");
    this.name = "OneTimeExpensePastCompetenceDeleteError";
  }
}

export class InstallmentExpenseNotFoundError extends DomainError {
  public readonly code = "INSTALLMENT_EXPENSE_NOT_FOUND";

  public constructor(expenseId: string) {
    super(`Installment expense with id "${expenseId}" not found`);
    this.name = "InstallmentExpenseNotFoundError";
  }
}

export class InstallmentExpensePastStartError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  public constructor() {
    super("Cannot create installment expense starting in a past month");
    this.name = "InstallmentExpensePastStartError";
  }
}

export class InstallmentFinancialImmutableError extends DomainError {
  public readonly code = "INSTALLMENT_FINANCIAL_IMMUTABLE";

  public constructor() {
    super("Financial attributes of installment expenses cannot be modified");
    this.name = "InstallmentFinancialImmutableError";
  }
}

export class InstallmentHasPastCompetenceError extends DomainError {
  public readonly code = "INSTALLMENT_HAS_PAST_COMPETENCE";

  public constructor() {
    super("Cannot delete installment expense with installments in past months");
    this.name = "InstallmentHasPastCompetenceError";
  }
}

export class NoFutureInstallmentsError extends DomainError {
  public readonly code = "NO_FUTURE_INSTALLMENTS";

  public constructor() {
    super("There are no future installments to remove");
    this.name = "NoFutureInstallmentsError";
  }
}

export class RecurringExpenseNotFoundError extends DomainError {
  public readonly code = "RECURRING_EXPENSE_NOT_FOUND";

  public constructor(expenseId: string) {
    super(`Recurring expense with id "${expenseId}" not found`);
    this.name = "RecurringExpenseNotFoundError";
  }
}

export class RecurringExpenseAlreadyExpiredError extends DomainError {
  public readonly code = "RECURRING_EXPENSE_ALREADY_EXPIRED";

  public constructor() {
    super("Recurring expense has already expired");
    this.name = "RecurringExpenseAlreadyExpiredError";
  }
}

export class PastCompetenceError extends DomainError {
  public readonly code = "PAST_COMPETENCE";

  public constructor() {
    super("Competence must be in the current or future month");
    this.name = "PastCompetenceError";
  }
}

export class PastEffectiveDateError extends DomainError {
  public readonly code = "PAST_EFFECTIVE_DATE";

  public constructor() {
    super("Effective date must be in the current or future month");
    this.name = "PastEffectiveDateError";
  }
}

export class EffectiveDateOutOfRangeError extends DomainError {
  public readonly code = "EFFECTIVE_DATE_OUT_OF_RANGE";

  public constructor() {
    super("Effective date must be within the recurring expense active period");
    this.name = "EffectiveDateOutOfRangeError";
  }
}

export class EndDateBeforeStartError extends DomainError {
  public readonly code = "END_DATE_BEFORE_START";

  public constructor() {
    super("End date must be on or after the start date");
    this.name = "EndDateBeforeStartError";
  }
}
