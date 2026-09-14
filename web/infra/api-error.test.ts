import { describe, expect, it } from "vitest";
import { getApiErrorMessage, getImportRowMessage, isInvalidSessionError } from "./api-error";

/**
 * Espelho do mapa privado `MESSAGES` de `api-error.ts`. Duplicado de propósito:
 * exportar o mapa só para teste acoplaria a produção à suíte, e a tabela aqui
 * documenta a cópia pt-BR exata que o usuário vê.
 */
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

const FALLBACK = "Algo deu errado.";

/** Erro no formato que o axios entrega a quem chamou. */
function axiosLike(over: Record<string, unknown>) {
  return { isAxiosError: true, request: {}, ...over };
}

function withBody(body: unknown, status = 400) {
  return axiosLike({ response: { status, data: body } });
}

describe("isInvalidSessionError", () => {
  it("considera 401 sessão inválida", () => {
    expect(isInvalidSessionError(withBody({}, 401))).toBe(true);
  });

  it("considera 404 sessão inválida", () => {
    expect(isInvalidSessionError(withBody({}, 404))).toBe(true);
  });

  it.each([400, 409, 422, 500, 503])("não considera %i sessão inválida", (status) => {
    expect(isInvalidSessionError(withBody({}, status))).toBe(false);
  });

  it("não considera falha de rede (sem response) sessão inválida", () => {
    expect(isInvalidSessionError(axiosLike({ response: undefined }))).toBe(false);
  });

  it.each([[null], [undefined], ["erro"], [42]])("não quebra com %p", (value) => {
    expect(isInvalidSessionError(value)).toBe(false);
  });
});

describe("getApiErrorMessage", () => {
  it("usa o primeiro detalhe quando VALIDATION_ERROR traz details", () => {
    const error = withBody({
      error: "VALIDATION_ERROR",
      details: { amount: ["Valor deve ser positivo."] },
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Valor deve ser positivo.");
  });

  it("achata múltiplos campos e devolve o primeiro detalhe", () => {
    const error = withBody({
      error: "VALIDATION_ERROR",
      details: {
        description: ["Descrição obrigatória.", "Máximo de 120 caracteres."],
        amount: ["Valor deve ser positivo."],
      },
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Descrição obrigatória.");
  });

  it("cai na mensagem mapeada quando VALIDATION_ERROR não traz details", () => {
    const error = withBody({ error: "VALIDATION_ERROR" });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Dados inválidos. Revise os campos e tente novamente.",
    );
  });

  it("cai na mensagem mapeada quando details está presente mas vazio", () => {
    const error = withBody({ error: "VALIDATION_ERROR", details: {} });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Dados inválidos. Revise os campos e tente novamente.",
    );
  });

  it("cai na mensagem mapeada quando o array de details está vazio", () => {
    const error = withBody({ error: "VALIDATION_ERROR", details: { amount: [] } });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Dados inválidos. Revise os campos e tente novamente.",
    );
  });

  it.each(Object.entries(MESSAGES))("traduz o código %s", (code, message) => {
    expect(getApiErrorMessage(withBody({ error: code }), FALLBACK)).toBe(message);
  });

  it("usa o fallback para código desconhecido", () => {
    expect(getApiErrorMessage(withBody({ error: "CODIGO_INEXISTENTE" }), FALLBACK)).toBe(FALLBACK);
  });

  it("usa o fallback quando o corpo não traz error", () => {
    expect(getApiErrorMessage(withBody({ message: "oops" }), FALLBACK)).toBe(FALLBACK);
  });

  it("avisa sobre timeout quando o código é ECONNABORTED", () => {
    const error = axiosLike({ code: "ECONNABORTED", response: undefined });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "A requisição demorou demais. Verifique sua conexão e tente novamente.",
    );
  });

  it("avisa sobre conexão quando há request mas não há response", () => {
    const error = axiosLike({ response: undefined });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Não foi possível falar com o servidor. Verifique sua conexão.",
    );
  });

  it("usa o fallback para um erro nu, sem request nem response", () => {
    expect(getApiErrorMessage(new Error("boom"), FALLBACK)).toBe(FALLBACK);
  });

  it.each([[null], [undefined], ["erro"]])("usa o fallback para %p", (value) => {
    expect(getApiErrorMessage(value, FALLBACK)).toBe(FALLBACK);
  });

  it("dá precedência ao código mapeado sobre o timeout", () => {
    const error = axiosLike({
      code: "ECONNABORTED",
      response: { status: 409, data: { error: "VERSION_CONFLICT" } },
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "Já existe uma versão vigente a partir deste mês.",
    );
  });

  it("dá precedência ao detalhe de validação sobre o timeout", () => {
    const error = axiosLike({
      code: "ECONNABORTED",
      response: { status: 400, data: { error: "VALIDATION_ERROR", details: { a: ["Campo A."] } } },
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe("Campo A.");
  });

  it("cai no timeout quando o código do corpo é desconhecido", () => {
    const error = axiosLike({
      code: "ECONNABORTED",
      response: { status: 500, data: { error: "DESCONHECIDO" } },
    });

    expect(getApiErrorMessage(error, FALLBACK)).toBe(
      "A requisição demorou demais. Verifique sua conexão e tente novamente.",
    );
  });
});

describe("getApiErrorMessage: códigos da área de dados", () => {
  const withCode = (code: string) => ({ response: { data: { error: code } } });

  it.each([
    ["EXPORT_PERIOD_INVALID", "O mês final é anterior ao inicial."],
    ["EXPORT_PERIOD_TOO_LONG", "O período selecionado passa de 12 meses."],
    ["IMPORT_EMPTY_FILE", "O arquivo está vazio."],
    ["IMPORT_NO_VALID_ROWS", "O arquivo não contém nenhum lançamento válido."],
  ])("traduz %s", (code, expected) => {
    expect(getApiErrorMessage(withCode(code), "fallback")).toBe(expected);
  });

  it("orienta sobre o separador quando faltam colunas", () => {
    expect(getApiErrorMessage(withCode("IMPORT_MISSING_COLUMNS"), "fallback")).toContain(
      "ponto e vírgula",
    );
  });
});

describe("getImportRowMessage", () => {
  it.each([
    ["INVALID_COMPETENCE", "abril", 'Competência "abril" inválida — esperado AAAA-MM'],
    ["MONTH_OUT_OF_RANGE", "13", "Mês 13 fora de 1–12"],
    ["YEAR_OUT_OF_RANGE", "1999", "Ano 1999 fora do intervalo aceito — mínimo 2000"],
    ["INVALID_NATURE", "entrada", 'Natureza "entrada" inválida — use receita ou despesa'],
    ["INVALID_TYPE", "mensal", 'Tipo "mensal" inválido'],
    ["REVENUE_TYPE_NOT_ALLOWED", "parcelada", "Receita não pode ser parcelada — use fixa"],
    ["INVALID_AMOUNT", "abc", 'Valor "abc" inválido'],
    ["INVALID_INSTALLMENT", "5/3", 'Parcela "5/3" inválida'],
    ["DESCRIPTION_TOO_LONG", "300", "Descrição com 300 caracteres — o limite é 255"],
  ])("descreve %s", (code, value, expected) => {
    expect(getImportRowMessage(code, value)).toBe(expected);
  });

  it.each([
    ["EXPENSE_TYPE_NOT_ALLOWED", "Despesa fixa não existe — use recorrente"],
    ["EMPTY_DESCRIPTION", "Descrição vazia"],
    ["MISSING_CATEGORY", "Categoria obrigatória em despesas"],
  ])("descreve %s sem precisar de valor", (code, expected) => {
    expect(getImportRowMessage(code)).toBe(expected);
  });

  it("cai numa mensagem genérica para um código desconhecido", () => {
    expect(getImportRowMessage("ALGO_NOVO")).toBe("Linha inválida.");
  });
});

describe("getApiErrorMessage: corpo em texto", () => {
  it("lê o código quando o corpo veio como string JSON", () => {
    const error = { response: { data: '{"error":"EXPORT_PERIOD_TOO_LONG"}' } };

    expect(getApiErrorMessage(error, "fallback")).toBe("O período selecionado passa de 12 meses.");
  });

  it("cai no fallback quando a string não é JSON", () => {
    const error = { response: { data: "falha interna" } };

    expect(getApiErrorMessage(error, "fallback")).toBe("fallback");
  });
});

describe("getApiErrorMessage: corpo em bytes", () => {
  it("lê o código quando o corpo veio como ArrayBuffer", () => {
    const bytes = new TextEncoder().encode('{"error":"EXPORT_PERIOD_INVALID"}');
    const error = { response: { data: bytes.buffer } };

    expect(getApiErrorMessage(error, "fallback")).toBe("O mês final é anterior ao inicial.");
  });

  it("lê o código quando o corpo veio como Uint8Array", () => {
    const error = { response: { data: new TextEncoder().encode('{"error":"IMPORT_EMPTY_FILE"}') } };

    expect(getApiErrorMessage(error, "fallback")).toBe("O arquivo está vazio.");
  });
});
