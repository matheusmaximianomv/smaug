/** Só pode ser separador de milhar: grupos de exatamente 3 dígitos. */
const THOUSANDS_GROUPED = /^\d{1,3}(\.\d{3})+$/;

/** Prefixo de moeda e espaços (incl. o NBSP que o Intl produz). */
const CURRENCY_NOISE = /[R$\s ]/g;

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
export function parseAmount(input: string): number {
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
