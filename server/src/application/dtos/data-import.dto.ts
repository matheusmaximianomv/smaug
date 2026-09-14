/**
 * Códigos de problema por linha. São códigos, e não mensagens, porque a cópia mostrada ao usuário
 * é pt-BR e mora no web (`web/infra/api-error.ts`), enquanto o servidor fala inglês.
 */
export type ImportRowErrorCode =
  | "INVALID_COMPETENCE"
  | "MONTH_OUT_OF_RANGE"
  | "YEAR_OUT_OF_RANGE"
  | "INVALID_NATURE"
  | "INVALID_TYPE"
  | "REVENUE_TYPE_NOT_ALLOWED"
  | "EXPENSE_TYPE_NOT_ALLOWED"
  | "EMPTY_DESCRIPTION"
  | "DESCRIPTION_TOO_LONG"
  | "INVALID_AMOUNT"
  | "MISSING_CATEGORY"
  | "INVALID_INSTALLMENT";

export interface ImportErrorDto {
  line: number;
  code: ImportRowErrorCode;
  value?: string;
}

export interface ImportCountsDto {
  oneTime: number;
  fixed: number;
  installment: number;
  recurring: number;
  series: number;
}

export interface ImportPreviewResponseDto {
  validRows: number;
  errors: ImportErrorDto[];
  counts: ImportCountsDto;
}

export interface ImportCreatedDto {
  oneTimeRevenues: number;
  fixedRevenues: number;
  oneTimeExpenses: number;
  installmentExpenses: number;
  recurringExpenses: number;
}

export interface ImportResultResponseDto {
  total: number;
  created: ImportCreatedDto;
  categoriesCreated: number;
}
