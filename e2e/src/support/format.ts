import { MONTH_NAMES_FULL, MONTH_NAMES_SHORT } from "./month-names.js";
import type { Competence } from "./competence.js";

/**
 * Mesma formatação de `web/shared/lib/formatCurrency.ts`. O Node 22 tem ICU
 * completo, então a string sai idêntica à do browser — inclusive o NBSP (U+00A0)
 * entre "R$" e o número.
 */
export function brl(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/**
 * Versão com espaço comum. As asserções de texto do Playwright normalizam
 * whitespace (e `\s` do JS inclui  ), então `toContainText(brl(x))` casa;
 * use esta só onde precisar de comparação byte a byte com espaço simples.
 */
export function brlLoose(value: number): string {
  return brl(value).replace(/ /g, " ");
}

/** Espelha `shared/lib/dateUtils.formatMonthYear` → "Set/26". */
export function monthShort({ year, month }: Competence): string {
  return `${MONTH_NAMES_SHORT[month - 1]}/${String(year).slice(-2)}`;
}

/** Espelha o label do MonthNavigator → "Setembro de 2026". */
export function monthLong({ year, month }: Competence): string {
  return `${MONTH_NAMES_FULL[month - 1]} de ${year}`;
}
