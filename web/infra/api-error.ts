import { AxiosError } from "axios";

interface ApiErrorBody {
  error?: string;
  message?: string;
  details?: Record<string, string[]>;
}

/** Mensagens em pt-BR para os códigos de erro emitidos pela API. */
const MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: "Dados inválidos. Revise os campos e tente novamente.",
  UNAUTHORIZED: "Sessão inválida. Faça login novamente.",

  USER_NOT_FOUND: "Usuário não encontrado.",
  EMAIL_ALREADY_EXISTS: "Já existe uma conta com este e-mail.",

  EXPENSE_CATEGORY_NOT_FOUND: "Categoria não encontrada.",
  EXPENSE_CATEGORY_NAME_ALREADY_EXISTS: "Já existe uma categoria com este nome.",
  EXPENSE_CATEGORY_HAS_LINKED_EXPENSES:
    "Esta categoria possui despesas vinculadas e não pode ser excluída.",

  ONE_TIME_EXPENSE_NOT_FOUND: "Despesa não encontrada.",
  INSTALLMENT_EXPENSE_NOT_FOUND: "Parcelamento não encontrado.",
  RECURRING_EXPENSE_NOT_FOUND: "Despesa recorrente não encontrada.",
  FIXED_REVENUE_NOT_FOUND: "Receita fixa não encontrada.",
  REVENUE_NOT_FOUND: "Receita não encontrada.",

  PAST_COMPETENCE: "Não é possível alterar lançamentos de competências passadas.",
  PAST_START_DATE: "O início da vigência não pode ser uma competência passada.",
  PAST_EFFECTIVE_DATE: "A vigência da nova versão não pode ser um mês passado.",
  PAST_TERMINATION_DATE: "O encerramento não pode ser em uma competência passada.",
  END_DATE_BEFORE_START: "O término não pode ser anterior ao início.",
  EFFECTIVE_DATE_BEFORE_START: "A vigência não pode ser anterior ao início do lançamento.",
  EFFECTIVE_DATE_AFTER_END: "A vigência não pode ser posterior ao encerramento.",
  EFFECTIVE_DATE_OUT_OF_RANGE: "A vigência está fora do período do lançamento.",

  UNALTERABLE_REVENUE: "Esta receita é inalterável: só é possível encerrá-la.",
  VERSION_CONFLICT: "Já existe uma versão vigente a partir deste mês.",
  ALREADY_EXPIRED: "Este lançamento já está encerrado.",
  RECURRING_EXPENSE_ALREADY_EXPIRED: "Esta despesa recorrente já está encerrada.",

  INSTALLMENT_FINANCIAL_IMMUTABLE:
    "Valor total e número de parcelas não podem ser alterados após a criação.",
  INSTALLMENT_HAS_PAST_COMPETENCE:
    "Este parcelamento já possui parcelas em meses passados e não pode ser excluído.",
  NO_FUTURE_INSTALLMENTS: "Não há parcelas futuras para encerrar.",
};

/**
 * Distingue "esta sessão não vale mais" de "a chamada falhou agora".
 * Só 401 (header ausente/inválido) e 404 (usuário inexistente) invalidam a sessão;
 * falha de rede, timeout e 5xx são transitórios e não devem deslogar ninguém.
 */
export function isInvalidSessionError(error: unknown): boolean {
  const status = (error as AxiosError)?.response?.status;
  return status === 401 || status === 404;
}

/**
 * Converte um erro de requisição na mensagem que o usuário deve ver.
 * Prioriza o código de negócio devolvido pela API; cai no detalhe de validação
 * e, por último, em uma mensagem genérica.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const body = (error as AxiosError<ApiErrorBody>)?.response?.data;

  if (body?.error) {
    if (body.error === "VALIDATION_ERROR" && body.details) {
      const first = Object.values(body.details).flat()[0];
      if (first) return first;
    }
    const mapped = MESSAGES[body.error];
    if (mapped) return mapped;
  }

  if ((error as AxiosError)?.code === "ECONNABORTED") {
    return "A requisição demorou demais. Verifique sua conexão e tente novamente.";
  }

  if ((error as AxiosError)?.response === undefined && (error as AxiosError)?.request) {
    return "Não foi possível falar com o servidor. Verifique sua conexão.";
  }

  return fallback;
}
