/** Só pode ser separador de milhar: grupos de exatamente 3 dígitos. */
const THOUSANDS_GROUPED = /^\d{1,3}(\.\d{3})+$/;

/** Prefixo de moeda e espaços (incl. o NBSP que o Intl produz). */
const CURRENCY_NOISE = /[R$\s ]/g;

const CENTS = 100;

/**
 * Converte o texto digitado num formulário para número.
 *
 * Substitui o antigo `parseFloat(v.replace(",", "."))`, que trocava **apenas a
 * primeira** vírgula e não removia separador de milhar: `"1.234,56"` virava
 * `"1.234.56"`, e o `parseFloat` parava no segundo ponto devolvendo `1.234`.
 * O pior é que falhava em silêncio — 1.234 é positivo e passava na validação.
 *
 * Regras (pt-BR):
 * - vírgula presente → ela é o separador decimal, logo todo ponto é milhar;
 * - sem vírgula, mas em grupos de 3 dígitos (`"1.234"`) → milhar;
 * - sem vírgula e com um ponto solto (`"12.50"`) → decimal, para acomodar quem
 *   digita no formato en-US.
 *
 * Devolve `NaN` para entrada vazia ou não numérica — diferente de `parseFloat`,
 * que aceitaria lixo à direita (`parseFloat("12abc") === 12`).
 */
export function parseMoneyInput(input: string): number {
  const cleaned = input.replace(CURRENCY_NOISE, "");
  if (!cleaned) return NaN;

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", "."));
  }
  if (THOUSANDS_GROUPED.test(cleaned)) {
    return Number(cleaned.replace(/\./g, ""));
  }
  return Number(cleaned);
}

/**
 * Mesma regra do servidor: positivo e com no máximo duas casas decimais.
 * "10,555" é inválido em vez de ser arredondado em silêncio para 10,56.
 */
export function isValidMoneyInput(input: string): boolean {
  const value = parseMoneyInput(input);
  if (!Number.isFinite(value) || value <= 0) return false;
  const cents = value * CENTS;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

/** Número → texto editável no campo de valor: 1234.5 → "1234,50". */
export function toMoneyInput(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

const COMPACT = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

/**
 * Total da faixa de 12 meses: sem "R$" e sem centavos ("3.420"). Os centavos são
 * descartados, não arredondados, para que a célula nunca mostre mais do que o
 * total exibido no resumo.
 */
export function formatCompactCurrency(value: number): string {
  return COMPACT.format(Math.trunc(value));
}
