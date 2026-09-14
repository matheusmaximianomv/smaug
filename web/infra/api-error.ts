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

  EXPORT_PERIOD_INVALID: "O mês final é anterior ao inicial.",
  EXPORT_PERIOD_TOO_LONG: "O período selecionado passa de 12 meses.",
  IMPORT_EMPTY_FILE: "O arquivo está vazio.",
  IMPORT_MISSING_COLUMNS:
    "O arquivo não tem as colunas obrigatórias. Verifique se o separador é ponto e vírgula.",
  IMPORT_NO_VALID_ROWS: "O arquivo não contém nenhum lançamento válido.",
};

/**
 * Mensagens das linhas recusadas na importação. Ficam aqui, e não na feature, pelo mesmo motivo
 * da tabela acima: o servidor devolve código, a cópia em pt-BR é responsabilidade do web.
 */
const IMPORT_ROW_MESSAGES: Record<string, (value?: string) => string> = {
  INVALID_COMPETENCE: (value) => `Competência "${value}" inválida — esperado AAAA-MM`,
  MONTH_OUT_OF_RANGE: (value) => `Mês ${value} fora de 1–12`,
  YEAR_OUT_OF_RANGE: (value) => `Ano ${value} fora do intervalo aceito — mínimo 2000`,
  INVALID_NATURE: (value) => `Natureza "${value}" inválida — use receita ou despesa`,
  INVALID_TYPE: (value) => `Tipo "${value}" inválido`,
  REVENUE_TYPE_NOT_ALLOWED: (value) => `Receita não pode ser ${value} — use fixa`,
  EXPENSE_TYPE_NOT_ALLOWED: () => "Despesa fixa não existe — use recorrente",
  EMPTY_DESCRIPTION: () => "Descrição vazia",
  DESCRIPTION_TOO_LONG: (value) => `Descrição com ${value} caracteres — o limite é 255`,
  INVALID_AMOUNT: (value) => `Valor "${value}" inválido`,
  MISSING_CATEGORY: () => "Categoria obrigatória em despesas",
  INVALID_INSTALLMENT: (value) => `Parcela "${value}" inválida`,
};

/** Mensagem de uma linha recusada na importação. */
export function getImportRowMessage(code: string, value?: string): string {
  const build = IMPORT_ROW_MESSAGES[code];
  return build ? build(value) : "Linha inválida.";
}

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
 * O corpo chega como objeto na maioria das chamadas, mas não quando a requisição pediu um
 * `responseType` que impede o axios de desserializar — o download do CSV usa `arraybuffer` para
 * preservar o BOM, e aí o corpo do erro vem como bytes. Sem isto, um erro de negócio daquela rota
 * cairia na mensagem genérica em vez da cópia em pt-BR.
 */
function parseErrorBody(data: unknown): ApiErrorBody | undefined {
  // `instanceof ArrayBuffer` falha entre realms (jsdom cria os seus próprios globais), então a
  // checagem é pela tag interna.
  const isBuffer =
    Object.prototype.toString.call(data) === "[object ArrayBuffer]" || ArrayBuffer.isView(data);
  if (isBuffer) {
    return parseErrorBody(new TextDecoder().decode(data as ArrayBuffer));
  }
  if (typeof data !== "string") {
    return data as ApiErrorBody | undefined;
  }
  try {
    return JSON.parse(data) as ApiErrorBody;
  } catch {
    return undefined;
  }
}

/**
 * Converte um erro de requisição na mensagem que o usuário deve ver.
 * Prioriza o código de negócio devolvido pela API; cai no detalhe de validação
 * e, por último, em uma mensagem genérica.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const body = parseErrorBody((error as AxiosError<ApiErrorBody>)?.response?.data);

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
